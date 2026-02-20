/**
 * k6/load-test.js
 * ─────────────────────────────────────────────────────────
 * k6 load test for the CloudArc API.
 *
 * Run against staging:
 *   k6 run --env BASE_URL=http://152.42.194.51:8080 k6/load-test.js
 *
 * Run against production:
 *   k6 run --env BASE_URL=https://cloudsarc.site k6/load-test.js
 *
 * Install k6: https://k6.io/docs/get-started/installation/
 *
 * Output an HTML report (requires xk6-reporter):
 *   k6 run --out json=results.json k6/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────
const errorRate      = new Rate('errors');
const loginDuration  = new Trend('login_duration',  true);
const tasksDuration  = new Trend('tasks_duration',  true);

// ── Test configuration ────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 10  }, // ramp up to 10 VUs
    { duration: '1m',  target: 50  }, // sustain 50 VUs for 1 min
    { duration: '30s', target: 100 }, // spike to 100 VUs
    { duration: '30s', target: 50  }, // back down
    { duration: '30s', target: 0   }, // ramp down
  ],
  thresholds: {
    // p95 response time must be under 500ms
    http_req_duration:  ['p(95)<500'],
    // Error rate must stay under 5%
    errors:             ['rate<0.05'],
    // Login p95 under 800ms (bcrypt is heavier)
    login_duration:     ['p(95)<800'],
    // Task list p95 under 300ms
    tasks_duration:     ['p(95)<300'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// ── Shared state — set once in setup() ───────────────────
export function setup() {
  // Register a shared test user
  const uniqueSuffix = Date.now();
  const user = {
    username: `loadtest${uniqueSuffix}`,
    email:    `loadtest${uniqueSuffix}@k6.test`,
    password: 'Loadtest1',
  };

  const res = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify(user),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (res.status !== 201) {
    console.error('Setup failed: could not register test user', res.body);
    return {};
  }

  const body = res.json();
  return {
    email:        user.email,
    password:     user.password,
    accessToken:  body.data.accessToken,
  };
}

// ── Main VU scenario ──────────────────────────────────────
export default function (data) {
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  // 1. Health check
  const health = http.get(`${BASE_URL}/health`);
  check(health, { 'health 200': (r) => r.status === 200 });
  errorRate.add(health.status !== 200);

  sleep(0.5);

  // 2. Login (reuse token from setup, or login fresh)
  const loginStart = Date.now();
  const login = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: data.email, password: data.password }),
    params
  );
  loginDuration.add(Date.now() - loginStart);
  const loginOk = check(login, { 'login 200': (r) => r.status === 200 });
  errorRate.add(!loginOk);

  const token = loginOk ? login.json('data.accessToken') : data.accessToken;
  if (!token) { sleep(1); return; }

  const authParams = {
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  sleep(0.3);

  // 3. List tasks (paginated)
  const tasksStart = Date.now();
  const tasks = http.get(`${BASE_URL}/api/v1/tasks?page=1&limit=20`, authParams);
  tasksDuration.add(Date.now() - tasksStart);
  const tasksOk = check(tasks, { 'tasks 200': (r) => r.status === 200 });
  errorRate.add(!tasksOk);

  sleep(0.3);

  // 4. Create a task
  const create = http.post(
    `${BASE_URL}/api/v1/tasks`,
    JSON.stringify({ title: `k6 task ${Date.now()}`, user_id: 1 }),
    authParams
  );
  const createOk = check(create, { 'create task 201': (r) => r.status === 201 });
  errorRate.add(!createOk);

  sleep(1);
}

// ── Teardown ──────────────────────────────────────────────
export function teardown(data) {
  console.log('Load test complete. Base URL:', BASE_URL);
}
