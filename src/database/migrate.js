/**
 * database/migrate.js
 * ─────────────────────────────────────────────────────────
 * Runs the initial DDL to create the relational schema.
 *
 * Usage:  npm run migrate
 *
 * Schema overview
 * ───────────────
 * users
 *   id          SERIAL PRIMARY KEY
 *   username    VARCHAR(100)  UNIQUE NOT NULL
 *   email       VARCHAR(255)  UNIQUE NOT NULL
 *   created_at  TIMESTAMPTZ   DEFAULT NOW()
 *   updated_at  TIMESTAMPTZ   DEFAULT NOW()
 *
 * tasks
 *   id          SERIAL PRIMARY KEY
 *   title       VARCHAR(255)  NOT NULL
 *   description TEXT
 *   status      VARCHAR(20)   DEFAULT 'pending'
 *                              CHECK (status IN ('pending','in_progress','completed'))
 *   user_id     INTEGER       REFERENCES users(id) ON DELETE CASCADE
 *   created_at  TIMESTAMPTZ   DEFAULT NOW()
 *   updated_at  TIMESTAMPTZ   DEFAULT NOW()
 */

require('dotenv').config();
const pool = require('../config/database');

const up = `
-- Enable uuid extension (useful for future expansion)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL        PRIMARY KEY,
  username    VARCHAR(100)  NOT NULL UNIQUE,
  email       VARCHAR(255)  NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Tasks table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL        PRIMARY KEY,
  title       VARCHAR(255)  NOT NULL,
  description TEXT,
  status      VARCHAR(20)   NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'in_progress', 'completed')),
  user_id     INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status  ON tasks(status);
`;

async function migrate() {
  console.log('[Migrate] Running migrations…');
  try {
    await pool.query(up);
    console.log('[Migrate] ✔  Schema created successfully');
  } catch (err) {
    console.error('[Migrate] ✖  Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
