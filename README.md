# CloudArc API

A **production-grade REST API** built incrementally across 7 tiers — from a bare Express skeleton to a fully observable, rate-limited, role-protected, audit-logged service deployed on a live VPS with automated CI/CD.

**Live URL:** `https://cloudsarc.site`  
**Current version:** `1.5.0`  
**Stack:** Node.js 18 · Express 4 · PostgreSQL 16 · Redis 7 · Docker · Nginx · Prometheus · Grafana

---

## Table of Contents

- [What Was Built — Tier Overview](#what-was-built--tier-overview)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Running with Docker Compose](#running-with-docker-compose)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Role-Based Access Control](#role-based-access-control)
- [API Key Authentication](#api-key-authentication)
- [Redis Caching](#redis-caching)
- [Rate Limiting](#rate-limiting)
- [Audit Log](#audit-log)
- [Structured Error Codes](#structured-error-codes)
- [Observability](#observability)
- [Database Schema](#database-schema)
- [Database Migrations](#database-migrations)
- [CI/CD Pipeline](#cicd-pipeline)
- [Load Testing](#load-testing)
- [Environment Variables](#environment-variables)
- [API Versioning](#api-versioning)

---

## What Was Built — Tier Overview

### Tier 1 — Foundation
- Express app with PostgreSQL and Redis
- Users and Tasks CRUD endpoints
- Redis cache-aside pattern for task reads
- Joi request validation middleware
- Centralised error handling + 404 middleware
- 30 Jest integration tests (in-memory mocks, no real DB needed)

### Tier 2 — Observability & Reliability
- **Winston** structured logging (JSON in production, coloured in dev)
- **Morgan** HTTP access log piped through Winston
- **Sentry** error tracking (`/instrument.js`, captures unhandled exceptions)
- **Correlation IDs** — every request gets a `X-Request-ID` UUID (set if not provided)
- **UptimeRobot** external uptime monitoring on `/health`

### Tier 3 — Database Migrations & API Docs
- **node-pg-migrate** — versioned, idempotent SQL migrations (auto-run on container start)
- **Swagger / OpenAPI 3.0** — auto-generated docs served at `/api-docs`
- **Staging environment** — separate `docker-compose.staging.yml` + GitHub `staging` branch
- Schema seeded via migrations instead of raw SQL

### Tier 4 — Metrics & Correlation
- **Prometheus** scrapes `/metrics` every 10 s
- **Grafana** dashboards at `http://VPS:3001` (auto-provisioned datasource + dashboard)
- `prom-client` counters + histograms: `http_requests_total`, `http_request_duration_seconds`
- Correlation ID middleware attaches `req.requestId` used in all logs and audit entries

### Tier 5 — Pagination, Versioning & Refresh Tokens
- **Pagination** on all list endpoints — `?page=1&limit=20`, response includes `{ total, page, limit, pages, next, prev }`
- **API versioning** — canonical paths under `/api/v1/`, backward-compat alias at `/api/`
- **Refresh tokens** — stored in DB, 7-day expiry, single-use (rotation on each refresh), revoked on logout

### Tier 6 — Security Hardening
- **Redis-backed rate limiting** — 100 req/15 min per IP (skipped in `test` env)
- **RBAC** — `role` column on users (`user` / `admin`); `requireRole` middleware guards admin routes
- **Password reset** — time-limited token (30 min TTL) sent via email (Ethereal fallback in dev)
- **Graceful shutdown** — `SIGTERM` / `SIGINT` drain in-flight requests, close DB pool and Redis
- **k6 load tests** — `load-tests/smoke.js`, `load-tests/spike.js`, `load-tests/stress.js`

### Tier 7 — Audit Log, Error Codes & API Keys
- **Audit log** — `audit_logs` table records every mutating action (actor, action, resource, IP, request ID, metadata)
- **Structured error codes** — every error response includes a machine-readable `code` field (e.g. `AUTH_001`, `NOT_FOUND_TASK`, `RATE_LIMIT_001`)
- **API key authentication** — generate long-lived `cloudarc_<64hex>` keys; auth via `X-API-Key` header; bcrypt-hashed with 8-char prefix index
- **Cache bug fix** — `getAllTasks` was returning `undefined` due to stale variable name; fixed to `return result`
- **DB pool tuning** — `min: 2` warm connections, `statement_timeout: 10 s`, `max` env-configurable

---

## Project Structure

```
CloudArc/
├── docker-compose.yml            # Production: api, db, redis, nginx, prometheus, grafana
├── docker-compose.staging.yml    # Staging environment
├── Dockerfile
├── nginx/nginx.conf              # Reverse proxy + SSL termination
├── prometheus.yml                # Scrape config
├── grafana/
│   ├── provisioning/             # Auto-provision datasource
│   └── dashboards/               # Pre-built dashboard JSON
├── migrations/
│   ├── 1_initial_schema.js       # users + tasks tables
│   ├── 2_password_hash.js        # password_hash column on users
│   ├── 3_refresh_tokens.js       # refresh_tokens table
│   ├── 4_rbac.js                 # role column on users
│   ├── 5_password_reset_tokens.js
│   ├── 6_audit_logs.js           # audit_logs table
│   └── 7_api_keys.js             # api_keys table
├── load-tests/
│   ├── smoke.js
│   ├── spike.js
│   └── stress.js
├── tests/
│   ├── auth.test.js
│   ├── health.test.js
│   ├── tasks.test.js
│   └── users.test.js
└── src/
    ├── instrument.js             # Sentry must-be-first initialisation
    ├── server.js                 # HTTP server + graceful shutdown
    ├── app.js                    # Express app (middleware stack, routes)
    ├── config/
    │   ├── index.js              # Centralised env config
    │   ├── database.js           # pg Pool (min 2, max 20, statement_timeout 10 s)
    │   ├── redis.js              # ioredis client
    │   ├── logger.js             # Winston logger
    │   └── swagger.js            # OpenAPI spec config
    ├── errors/
    │   └── codes.js              # ERROR_CODES map + createError() factory
    ├── middleware/
    │   ├── authenticate.js       # Verifies JWT Bearer token
    │   ├── apiKeyAuth.js         # Verifies X-API-Key header
    │   ├── requireRole.js        # RBAC role guard
    │   ├── correlationId.js      # Attaches req.requestId UUID
    │   ├── rateLimiter.js        # Redis-backed express-rate-limit
    │   ├── validate.js           # Joi schema validation (422 on failure)
    │   ├── metrics.js            # prom-client HTTP metrics middleware
    │   ├── requestLogger.js      # Morgan -> Winston
    │   ├── errorHandler.js       # Centralised error -> JSON response
    │   └── notFound.js           # 404 catch-all
    ├── models/
    │   ├── userModel.js
    │   ├── taskModel.js
    │   ├── authModel.js          # refresh_tokens CRUD
    │   ├── passwordResetModel.js
    │   ├── auditModel.js         # append-only audit log
    │   └── apiKeyModel.js        # api_keys CRUD
    ├── routes/
    │   ├── index.js              # Mounts all routers under /api/v1/
    │   ├── authRoutes.js
    │   ├── userRoutes.js
    │   ├── taskRoutes.js
    │   └── apiKeyRoutes.js
    ├── controllers/
    │   ├── authController.js
    │   ├── userController.js
    │   └── taskController.js
    └── services/
        ├── authService.js        # Register, login, refresh, logout, password reset
        ├── userService.js        # User CRUD + audit logging
        ├── taskService.js        # Task CRUD + Redis cache + audit logging
        └── apiKeyService.js      # API key create, list, revoke
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18 |
| Framework | Express 4 |
| Database | PostgreSQL 16 (pg pool) |
| Cache / Rate limit | Redis 7 (ioredis) |
| Auth | JWT (access 15 min · refresh 7 d) + bcryptjs |
| Validation | Joi |
| Logging | Winston + Morgan |
| Error tracking | Sentry |
| Metrics | Prometheus + prom-client |
| Dashboards | Grafana |
| API docs | Swagger UI (swagger-jsdoc) |
| Migrations | node-pg-migrate |
| Testing | Jest + Supertest |
| Load testing | k6 |
| Container | Docker + Docker Compose |
| Reverse proxy | Nginx + Let's Encrypt (certbot) |
| CI/CD | GitHub Actions |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL 16
- Redis 7

```bash
# 1. Clone
git clone https://github.com/PruthuviDe/CloudArc.git && cd CloudArc

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env -- set DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET at minimum

# 4. Run migrations
npm run migrate

# 5. Start dev server (nodemon hot-reload)
npm run dev
```

API available at **http://localhost:3000**  
Swagger docs at **http://localhost:3000/api-docs**

### Run tests

```bash
npx jest --no-coverage     # 30 tests, ~4 s (in-memory mocks, no real DB/Redis needed)
```

---

## Running with Docker Compose

```bash
# Start all 6 services: api, db, redis, nginx, prometheus, grafana
docker compose up -d

# Migrations run automatically on api container start
# Tail logs
docker compose logs -f api
```

| Service | URL |
|---|---|
| API | http://localhost (via Nginx) |
| Swagger | http://localhost/api-docs |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin / admin) |
| Metrics | http://localhost/metrics |

---

## API Reference

All endpoints live under `/api/v1/`. The `/api/` prefix is a backward-compatible alias.

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | -- | Returns `{ status, version, uptime }` |

### Auth -- `/api/v1/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | -- | Register new user |
| POST | `/auth/login` | -- | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | -- | Exchange refresh token for new access token |
| POST | `/auth/logout` | Bearer | Revoke current refresh token |
| POST | `/auth/forgot-password` | -- | Send password reset email |
| POST | `/auth/reset-password` | -- | Reset password with token |

**Register body:** `{ username, email, password }`  
**Login body:** `{ email, password }`  
**Refresh body:** `{ refreshToken }`  
**Reset body:** `{ token, newPassword }`

### Users -- `/api/v1/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users` | Bearer | List users (paginated) |
| GET | `/users/:id` | Bearer | Get user by ID |
| POST | `/users` | Bearer | Create user |
| PUT | `/users/:id` | Bearer | Update user |
| DELETE | `/users/:id` | Bearer | Delete user |

Query: `?page=1&limit=20`

### Tasks -- `/api/v1/tasks`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/tasks` | Bearer / API Key | List tasks (paginated, filterable) |
| GET | `/tasks/:id` | Bearer / API Key | Get task by ID |
| POST | `/tasks` | Bearer / API Key | Create task |
| PUT | `/tasks/:id` | Bearer / API Key | Update task |
| DELETE | `/tasks/:id` | Bearer / API Key | Delete task |

Query filters: `?userId=1&status=pending&page=1&limit=20`  
**Allowed statuses:** `pending` · `in_progress` · `completed`

### API Keys -- `/api/v1/api-keys`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api-keys` | Bearer | List your API keys (no hashes) |
| POST | `/api-keys` | Bearer | Create a new API key (plaintext shown once) |
| DELETE | `/api-keys/:id` | Bearer | Revoke an API key |

**Create body:** `{ name, expiresInDays? }`

### Admin -- `/api/v1/admin` _(role: admin)_

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/users` | Bearer + admin | Full user list (paginated) |
| GET | `/admin/audit-logs` | Bearer + admin | Paginated audit trail |

**Audit log query:** `?actorId=1&action=task.create&page=1&limit=20`

---

## Authentication

The API supports two authentication schemes that can be used interchangeably on protected endpoints.

### JWT (Bearer)

```
POST /api/v1/auth/login
-> { accessToken, refreshToken }

Authorization: Bearer <accessToken>   # 15-minute expiry
```

Refresh flow:

```
POST /api/v1/auth/refresh
Body: { "refreshToken": "..." }
-> { accessToken, refreshToken }   # old token is revoked (rotation)
```

### Structured Auth Error Codes

| Code | Status | Meaning |
|---|---|---|
| `AUTH_001` | 401 | Invalid credentials |
| `AUTH_002` | 409 | Email already registered |
| `AUTH_003` | 409 | Username already taken |
| `AUTH_004` | 401 | Refresh token invalid or expired |
| `AUTH_005` | 401 | Refresh token already used (reuse detected) |
| `AUTH_006` | 401 | Access token missing or malformed |
| `AUTH_007` | 400 | Password reset token invalid or expired |

---

## Role-Based Access Control

Users have a `role` column: `user` (default) or `admin`.

- `requireRole('admin')` middleware guards `/api/v1/admin/*`
- Regular users receive `403 FORBIDDEN_001` on admin routes
- Role is embedded in the JWT payload and re-checked on every request

---

## API Key Authentication

Long-lived keys for machine-to-machine access (CI pipelines, scripts, integrations).

```
# Generate a key (requires a logged-in user)
POST /api/v1/api-keys
Authorization: Bearer <accessToken>
Body: { "name": "my-script", "expiresInDays": 365 }

-> { "key": "cloudarc_<128 hex chars>" }   <- shown ONCE, store it securely
```

```
# Use the key on any protected endpoint
X-API-Key: cloudarc_<128 hex chars>
```

**Security design:**
- Key is `cloudarc_` + 64 random bytes (hex) - 128 chars total
- First 8 chars after prefix are the **prefix index** -- used for a cheap DB lookup before bcrypt
- The full key is bcrypt-hashed (cost 10) and never stored in plaintext
- `last_used_at` updated asynchronously (non-blocking touch) on every successful auth
- Keys can be revoked instantly via `DELETE /api/v1/api-keys/:id`

---

## Redis Caching

Cache-aside pattern in `taskService.js`:

| Endpoint | Cache key | TTL |
|---|---|---|
| `GET /tasks` | `tasks:list:<serialised-query>` | 60 s (env: `CACHE_TTL`) |
| `GET /tasks/:id` | `tasks:<id>` | 60 s |

- **Invalidation:** any `POST`, `PUT`, or `DELETE` on tasks purges related keys immediately
- **Graceful degradation:** Redis errors are silently caught; API continues without cache
- **Offline queue disabled** (`enableOfflineQueue: false`) so connection failures fail-fast instead of hanging

---

## Rate Limiting

Redis-backed sliding-window rate limiter via `express-rate-limit` + `rate-limit-redis`:

- **Limit:** 100 requests / 15 minutes per IP
- **Scope:** `/api/v1/users` and `/api/v1/tasks` (auth routes are separate)
- **Response on breach:** `429` with `{ success: false, error: { code: "RATE_LIMIT_001", message: "..." } }`
- Automatically **disabled in `NODE_ENV=test`** to prevent test flakiness with in-memory mocks

---

## Audit Log

Every mutating action is recorded in the `audit_logs` table:

| Field | Description |
|---|---|
| `actor_id` | User ID who performed the action (NULL-safe on account deletion) |
| `actor_email` | Denormalised email (survives user deletion) |
| `action` | e.g. `task.create`, `task.update`, `task.delete`, `user.update`, `user.delete` |
| `resource` | Resource type (e.g. `task`, `user`) |
| `resource_id` | ID of the affected record |
| `metadata` | JSONB -- before/after data, extra context |
| `ip` | Requester IP |
| `request_id` | Correlation ID from `X-Request-ID` header |
| `created_at` | Timestamp |

**Properties:**
- Fire-and-forget -- audit writes never block the response
- Never throws -- DB errors are caught silently so audit never disrupts the main flow
- Append-only -- no update or delete on audit records

Admin endpoint: `GET /api/v1/admin/audit-logs?actorId=&action=&page=&limit=`

---

## Structured Error Codes

Every error response includes a machine-readable `code` field:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND_TASK",
    "message": "Task not found"
  }
}
```

Full code map (`src/errors/codes.js`):

| Code | Status | Meaning |
|---|---|---|
| `AUTH_001` | 401 | Invalid credentials |
| `AUTH_002` | 409 | Email already registered |
| `AUTH_003` | 409 | Username already taken |
| `AUTH_004` | 401 | Refresh token invalid |
| `AUTH_005` | 401 | Refresh token reuse detected |
| `AUTH_006` | 401 | JWT missing / malformed |
| `AUTH_007` | 400 | Password reset token invalid |
| `FORBIDDEN_001` | 403 | Insufficient role |
| `VALIDATION_001` | 422 | Joi validation failed |
| `NOT_FOUND_USER` | 404 | User not found |
| `NOT_FOUND_TASK` | 404 | Task not found |
| `RATE_LIMIT_001` | 429 | Too many requests |
| `API_KEY_001` | 401 | API key missing |
| `API_KEY_002` | 401 | API key invalid |
| `API_KEY_003` | 403 | API key revoked or expired |
| `SERVER_001` | 500 | Unexpected server error |

---

## Observability

### Logging (Winston)

- **Development:** coloured, human-readable
- **Production:** JSON -- one line per event with `level`, `message`, `timestamp`, plus structured metadata
- HTTP access log via Morgan piped into Winston's `http` level
- Every log line in production includes the correlation ID

### Error Tracking (Sentry)

- Initialised before all imports in `src/instrument.js`
- Captures unhandled promise rejections and uncaught exceptions
- Configure via `SENTRY_DSN` environment variable

### Metrics (Prometheus + Grafana)

Exposed at `GET /metrics` (Prometheus text format):

| Metric | Type | Description |
|---|---|---|
| `http_requests_total` | Counter | Labelled by method, route, status |
| `http_request_duration_seconds` | Histogram | P50/P90/P99 latency |
| Default Node.js metrics | Various | Event loop lag, heap, GC |

Grafana auto-provisions the Prometheus datasource and a pre-built dashboard on first boot.

### Uptime Monitoring

UptimeRobot monitors `GET https://cloudsarc.site/health` every 5 minutes.

---

## Database Schema

```
users
  id            SERIAL PK
  username      VARCHAR(50) UNIQUE NOT NULL
  email         VARCHAR(255) UNIQUE NOT NULL
  password_hash VARCHAR(255) NOT NULL
  role          VARCHAR(20) DEFAULT 'user'
  created_at    TIMESTAMPTZ DEFAULT NOW()
  updated_at    TIMESTAMPTZ DEFAULT NOW()

tasks
  id            SERIAL PK
  user_id       INT FK -> users.id ON DELETE CASCADE
  title         VARCHAR(255) NOT NULL
  description   TEXT
  status        VARCHAR(20) DEFAULT 'pending'
  created_at    TIMESTAMPTZ DEFAULT NOW()
  updated_at    TIMESTAMPTZ DEFAULT NOW()

refresh_tokens
  id            SERIAL PK
  user_id       INT FK -> users.id ON DELETE CASCADE
  token_hash    VARCHAR(255) UNIQUE NOT NULL
  expires_at    TIMESTAMPTZ NOT NULL
  revoked       BOOLEAN DEFAULT FALSE
  created_at    TIMESTAMPTZ DEFAULT NOW()

password_reset_tokens
  id            SERIAL PK
  user_id       INT FK -> users.id ON DELETE CASCADE
  token_hash    VARCHAR(255) UNIQUE NOT NULL
  expires_at    TIMESTAMPTZ NOT NULL
  used          BOOLEAN DEFAULT FALSE
  created_at    TIMESTAMPTZ DEFAULT NOW()

audit_logs
  id            BIGSERIAL PK
  actor_id      INT FK -> users.id ON DELETE SET NULL
  actor_email   VARCHAR(255)
  action        VARCHAR(100) NOT NULL
  resource      VARCHAR(100)
  resource_id   VARCHAR(100)
  metadata      JSONB
  ip            VARCHAR(45)
  request_id    VARCHAR(36)
  created_at    TIMESTAMPTZ DEFAULT NOW()

api_keys
  id            SERIAL PK
  user_id       INT FK -> users.id ON DELETE CASCADE
  name          VARCHAR(100) NOT NULL
  key_hash      VARCHAR(255) UNIQUE NOT NULL
  key_prefix    VARCHAR(10) NOT NULL
  last_used_at  TIMESTAMPTZ
  expires_at    TIMESTAMPTZ
  revoked       BOOLEAN DEFAULT FALSE
  created_at    TIMESTAMPTZ DEFAULT NOW()
```

---

## Database Migrations

Migrations are managed with **node-pg-migrate** and run automatically when the API container starts:

```bash
# Run migrations manually
npm run migrate

# Check migration status
npx node-pg-migrate status
```

Migrations are idempotent -- already-applied ones are skipped. Each file is in `migrations/` and numbered sequentially.

---

## CI/CD Pipeline

GitHub Actions automates the full deploy chain:

```
Push to develop
    -> Run tests (Jest)
    -> Push to staging branch
    -> Auto-create PR: staging -> main
    -> Auto-merge (after checks pass)
    -> VPS webhook pulls latest main
    -> docker compose pull && docker compose up -d --build
    -> Migrations run on container start
```

| Branch | Environment | Auto-deploy |
|---|---|---|
| `develop` | Local / dev | On push: triggers staging PR |
| `staging` | Staging (same VPS, staging compose) | On push to staging |
| `main` | Production (`https://cloudsarc.site`) | On merge from staging |

---

## Load Testing

k6 load tests in `load-tests/`:

| Script | Profile | Description |
|---|---|---|
| `smoke.js` | 1 VU, 30 s | Basic sanity -- does the API respond? |
| `spike.js` | 0 -> 200 VU ramp | Sudden traffic spike recovery |
| `stress.js` | Sustained 100 VU, 5 min | Find breaking point under load |

```bash
# Run smoke test (requires k6 installed)
k6 run load-tests/smoke.js
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `PORT` | `3000` | HTTP listen port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `cloudarc` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | -- | Database password |
| `DB_POOL_MAX` | `20` | Max DB pool connections |
| `DB_STATEMENT_TIMEOUT_MS` | `10000` | Query timeout in ms |
| `DATABASE_URL` | -- | Full connection string (used by node-pg-migrate) |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | -- | Redis password (optional) |
| `CACHE_TTL` | `60` | Cache TTL in seconds |
| `JWT_SECRET` | -- | Secret for access token signing |
| `JWT_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_SECRET` | -- | Secret for refresh token signing |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifetime |
| `EMAIL_HOST` | -- | SMTP host (Ethereal used if blank) |
| `EMAIL_PORT` | `587` | SMTP port |
| `EMAIL_SECURE` | `false` | Use TLS |
| `EMAIL_USER` | -- | SMTP username |
| `EMAIL_PASS` | -- | SMTP password |
| `EMAIL_FROM` | -- | From address |
| `FRONTEND_URL` | -- | Used in password reset links |
| `PASSWORD_RESET_TTL_MIN` | `30` | Reset token lifetime (minutes) |
| `LOG_LEVEL` | `info` | Winston log level |
| `SENTRY_DSN` | -- | Sentry DSN (disabled if blank) |
| `GRAFANA_PASSWORD` | `admin` | Grafana admin password |

---

## API Versioning

All endpoints are versioned under `/api/v1/`. The unversioned `/api/` prefix is maintained as a **backward-compatible alias** so existing clients do not break.

New breaking changes will introduce `/api/v2/` while `/api/v1/` remains supported.

---

## License

ISC
