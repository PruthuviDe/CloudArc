/* eslint-disable camelcase */
/**
 * migrations/2_add_password_hash.js
 * ─────────────────────────────────────────────────────────
 * Adds the password_hash column to the users table.
 *
 * This column was added as part of Tier 1 (JWT auth).
 * The migration uses ADD COLUMN IF NOT EXISTS so it's safe
 * to run even if the column was already added manually.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      DROP COLUMN IF EXISTS password_hash;
  `);
};
