/* eslint-disable camelcase */
/**
 * migrations/3_refresh_tokens.js
 * ─────────────────────────────────────────────────────────
 * Creates the refresh_tokens table for the Tier 5 refresh
 * token rotation pattern:
 *
 *   Access token  → short-lived (15 min), stateless JWT
 *   Refresh token → long-lived  (7 days), stored in DB
 *
 * Each row is a single-use token (rotation = old revoked
 * when new one is issued). The `family` column groups all
 * tokens from one login session so the entire family can
 * be revoked on suspicious reuse.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         SERIAL       PRIMARY KEY,
      token      TEXT         NOT NULL UNIQUE,
      user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      family     UUID         NOT NULL DEFAULT gen_random_uuid(),
      revoked    BOOLEAN      NOT NULL DEFAULT FALSE,
      expires_at TIMESTAMPTZ  NOT NULL,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token   ON refresh_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family  ON refresh_tokens(family);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS refresh_tokens CASCADE;
  `);
};
