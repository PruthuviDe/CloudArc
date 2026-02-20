/* eslint-disable camelcase */
/**
 * migrations/1_initial_schema.js
 * ─────────────────────────────────────────────────────────
 * Creates the initial CloudArc relational schema.
 *
 * ALL statements use IF NOT EXISTS so this migration is
 * safe to run against a database that was bootstrapped
 * manually from schema.sql — it will simply be a no-op.
 *
 * Tables
 * ───────
 *   users  — registered accounts (no password_hash yet;
 *             added in migration 2)
 *   tasks  — items owned by a user
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    -- Enable uuid-ossp (idempotent)
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- ── Users ──────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL        PRIMARY KEY,
      username   VARCHAR(100)  NOT NULL UNIQUE,
      email      VARCHAR(255)  NOT NULL UNIQUE,
      created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    -- ── Tasks ──────────────────────────────────────────────
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

    -- ── Indexes ────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status  ON tasks(status);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS tasks CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP EXTENSION IF EXISTS "uuid-ossp";
  `);
};
