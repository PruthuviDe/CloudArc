/**
 * tests/tasks.test.js
 * ─────────────────────────────────────────────────────────
 * Tests for /api/tasks endpoints.
 * TaskService is mocked. Real JWT used to pass auth guard.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-for-jest';

jest.mock('../src/services/taskService');
const TaskService = require('../src/services/taskService');
const app = require('../src/app');

const AUTH_TOKEN = jwt.sign(
  { id: 1, username: 'testuser', email: 'test@example.com' },
  'test-secret-for-jest',
  { expiresIn: '1h' }
);
const AUTH_HEADER = `Bearer ${AUTH_TOKEN}`;

const FAKE_TASK = {
  id: 1,
  title: 'Write tests',
  description: 'Cover all endpoints',
  status: 'pending',
  user_id: 1,
  created_at: new Date().toISOString(),
};

beforeEach(() => jest.clearAllMocks());

// ── Auth guard ────────────────────────────────────────────

describe('Auth guard on /api/tasks', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/tasks ────────────────────────────────────────

describe('GET /api/tasks', () => {
  it('returns task list', async () => {
    TaskService.getAllTasks.mockResolvedValue([FAKE_TASK]);

    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── GET /api/tasks/:id ────────────────────────────────────

describe('GET /api/tasks/:id', () => {
  it('returns a single task', async () => {
    TaskService.getTaskById.mockResolvedValue(FAKE_TASK);

    const res = await request(app)
      .get('/api/tasks/1')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(1);
  });

  it('returns 404 when task not found', async () => {
    const err = new Error('Task not found');
    err.statusCode = 404;
    TaskService.getTaskById.mockRejectedValue(err);

    const res = await request(app)
      .get('/api/tasks/999')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(404);
  });
});

// ── POST /api/tasks ───────────────────────────────────────

describe('POST /api/tasks', () => {
  it('creates a task and returns 201', async () => {
    TaskService.createTask.mockResolvedValue(FAKE_TASK);

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH_HEADER)
      .send({ title: 'Write tests', user_id: 1 });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Write tests');
  });

  it('returns 422 when title is missing', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH_HEADER)
      .send({ user_id: 1 });

    expect(res.status).toBe(422);
  });

  it('returns 422 when user_id is missing', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH_HEADER)
      .send({ title: 'Test task' });

    expect(res.status).toBe(422);
  });

  it('returns 422 for unknown status value', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH_HEADER)
      .send({ title: 'Task', user_id: 1, status: 'invalid_status' });

    expect(res.status).toBe(422);
  });
});

// ── PUT /api/tasks/:id ────────────────────────────────────

describe('PUT /api/tasks/:id', () => {
  it('updates a task', async () => {
    TaskService.updateTask.mockResolvedValue({ ...FAKE_TASK, status: 'completed' });

    const res = await request(app)
      .put('/api/tasks/1')
      .set('Authorization', AUTH_HEADER)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  it('returns 422 when body is empty', async () => {
    const res = await request(app)
      .put('/api/tasks/1')
      .set('Authorization', AUTH_HEADER)
      .send({});

    expect(res.status).toBe(422);
  });
});
