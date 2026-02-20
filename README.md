# CloudArc API

Industry-structured REST API built with **Node.js / Express**, **PostgreSQL**, and **Redis**.  
Designed as a clean foundation for a full DevOps pipeline (Docker, CI/CD, Kubernetes).

---

## Project Structure

```
CloudArc/
├── .env.example              # Environment variable template
├── .gitignore
├── package.json
├── README.md
└── src/
    ├── server.js             # Entry point — boots the HTTP server
    ├── app.js                # Express app configuration
    ├── config/
    │   ├── index.js          # Centralised env-based config
    │   ├── database.js       # PostgreSQL connection pool
    │   └── redis.js          # Redis client (ioredis)
    ├── controllers/
    │   ├── userController.js # HTTP handlers for /api/users
    │   └── taskController.js # HTTP handlers for /api/tasks
    ├── database/
    │   ├── schema.sql        # Standalone SQL reference
    │   ├── migrate.js        # Creates tables (npm run migrate)
    │   └── seed.js           # Inserts sample data (npm run seed)
    ├── middleware/
    │   ├── errorHandler.js   # Centralised error-handling middleware
    │   ├── notFound.js       # 404 catch-all
    │   └── requestLogger.js  # Morgan HTTP logging
    ├── models/
    │   ├── userModel.js      # Data-access layer for users
    │   └── taskModel.js      # Data-access layer for tasks
    ├── routes/
    │   ├── index.js          # Aggregates all resource routers
    │   ├── userRoutes.js     # User route definitions
    │   └── taskRoutes.js     # Task route definitions
    └── services/
        ├── userService.js    # Business logic for users
        └── taskService.js    # Business logic for tasks + Redis cache
```

---

## Tech Stack

| Layer     | Technology        |
|-----------|-------------------|
| Runtime   | Node.js ≥ 18      |
| Framework | Express 4         |
| Database  | PostgreSQL        |
| Cache     | Redis (ioredis)   |
| Security  | Helmet, CORS      |

---

## Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** running locally (or via Docker)
- **Redis** running locally (or via Docker)

### Quick-start with Docker (optional)

```bash
# Start Postgres + Redis in the background
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cloudarc -p 5432:5432 postgres:16
docker run -d --name redis -p 6379:6379 redis:7
```

---

## Getting Started

```bash
# 1. Clone the repo
git clone <repo-url> && cd CloudArc

# 2. Install dependencies
npm install

# 3. Copy and edit environment variables
cp .env.example .env
#    → Adjust DB_HOST, DB_USER, DB_PASSWORD, etc. as needed

# 4. Run database migrations (creates tables)
npm run migrate

# 5. (Optional) Seed sample data
npm run seed

# 6. Start the server
npm run dev        # development (hot-reload via nodemon)
# or
npm start          # production
```

The API will be available at **http://localhost:3000**.

---

## API Endpoints

### Health Check

| Method | Path      | Description             |
|--------|-----------|-------------------------|
| GET    | `/health` | Returns `{ status: "ok" }` |

### Users — `/api/users`

| Method | Path             | Description        | Body                              |
|--------|------------------|--------------------|-----------------------------------|
| GET    | `/api/users`     | List all users     | —                                 |
| GET    | `/api/users/:id` | Get user by id     | —                                 |
| POST   | `/api/users`     | Create a new user  | `{ "username": "", "email": "" }` |
| PUT    | `/api/users/:id` | Update a user      | `{ "username": "", "email": "" }` |
| DELETE | `/api/users/:id` | Delete a user      | —                                 |

### Tasks — `/api/tasks`

| Method | Path             | Description        | Body / Query                                                     |
|--------|------------------|--------------------|------------------------------------------------------------------|
| GET    | `/api/tasks`     | List all tasks     | Query: `?userId=1&status=pending`                                |
| GET    | `/api/tasks/:id` | Get task by id     | —                                                                |
| POST   | `/api/tasks`     | Create a new task  | `{ "title": "", "description": "", "status": "pending", "userId": 1 }` |
| PUT    | `/api/tasks/:id` | Update a task      | `{ "title": "", "description": "", "status": "" }`              |
| DELETE | `/api/tasks/:id` | Delete a task      | —                                                                |

**Allowed task statuses:** `pending`, `in_progress`, `completed`

---

## Database Schema

```
┌──────────────┐          ┌──────────────────┐
│    users     │          │      tasks       │
├──────────────┤          ├──────────────────┤
│ id       PK  │◄────────│ user_id   FK     │
│ username     │          │ id        PK     │
│ email        │          │ title            │
│ created_at   │          │ description      │
│ updated_at   │          │ status           │
└──────────────┘          │ created_at       │
                          │ updated_at       │
                          └──────────────────┘
```

- `tasks.user_id` → `users.id` with **ON DELETE CASCADE**
- Indexes on `tasks.user_id` and `tasks.status`

---

## Redis Caching Strategy

Redis caching is applied in `taskService.js` to reduce PostgreSQL load on read-heavy endpoints:

| Endpoint          | Cache Key Pattern       | TTL (default) |
|-------------------|-------------------------|---------------|
| `GET /api/tasks`     | `tasks:list:<query>`  | 60 s          |
| `GET /api/tasks/:id` | `tasks:<id>`          | 60 s          |

- **Cache-aside pattern**: Check Redis first → if miss, query DB → store result in Redis.
- **Invalidation**: Any `POST`, `PUT`, or `DELETE` on tasks wipes related cache keys immediately.
- **Graceful degradation**: If Redis is unavailable the API continues to work, just without caching.

---

## Example Requests (cURL)

```bash
# Create a user
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com"}'

# List users
curl -s http://localhost:3000/api/users | jq

# Create a task for user 1
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Setup CI/CD","description":"GitHub Actions","userId":1}'

# List all tasks (cached in Redis)
curl -s http://localhost:3000/api/tasks | jq

# Filter tasks by status
curl -s "http://localhost:3000/api/tasks?status=pending" | jq

# Update a task
curl -s -X PUT http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}'

# Delete a task
curl -s -X DELETE http://localhost:3000/api/tasks/1
```

---

## Environment Variables

| Variable       | Default      | Description                  |
|----------------|--------------|------------------------------|
| `NODE_ENV`     | development  | `development` / `production` |
| `PORT`         | 3000         | HTTP listen port             |
| `DB_HOST`      | localhost    | PostgreSQL host              |
| `DB_PORT`      | 5432         | PostgreSQL port              |
| `DB_NAME`      | cloudarc     | Database name                |
| `DB_USER`      | postgres     | Database user                |
| `DB_PASSWORD`  | postgres     | Database password            |
| `REDIS_HOST`   | localhost    | Redis host                   |
| `REDIS_PORT`   | 6379         | Redis port                   |
| `REDIS_PASSWORD`| —           | Redis password (optional)    |
| `CACHE_TTL`    | 60           | Cache time-to-live (seconds) |

---

## Design for DevOps Readiness

This project is intentionally structured for easy Dockerization and CI/CD integration:

- **Single entry point** (`src/server.js`) — straightforward `CMD` in a Dockerfile.
- **Health endpoint** (`/health`) — ready for container health checks and Kubernetes probes.
- **Environment-driven config** — no hardcoded values; everything flows through `.env` / env vars.
- **Graceful shutdown** — handles `SIGTERM` / `SIGINT` for clean container stops.
- **Separated concerns** — each layer can be tested independently.
- **No build step** — plain Node.js; reduces Docker image complexity.

---

## License

ISC