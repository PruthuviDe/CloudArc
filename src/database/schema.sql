-- ─────────────────────────────────────────────────────────
-- CloudArc — SQL Schema (standalone reference)
-- ─────────────────────────────────────────────────────────
-- This file can be executed directly against a PostgreSQL
-- database, or used as a reference for migration tooling.
-- ─────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL        PRIMARY KEY,
  username      VARCHAR(100)  NOT NULL UNIQUE,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash TEXT          NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Add password_hash to existing deployments (migration-safe)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- ── Tasks ────────────────────────────────────────────────
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
