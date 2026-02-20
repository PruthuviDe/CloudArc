/**
 * migrations/5_password_reset_tokens.js
 * ─────────────────────────────────────────────────────────
 * Creates the password_reset_tokens table.
 * Each record represents a one-time use reset link.
 */

exports.up = (pgm) => {
  pgm.createTable('password_reset_tokens', {
    id:         { type: 'SERIAL', primaryKey: true },
    user_id:    { type: 'INTEGER', notNull: true, references: '"users"', onDelete: 'CASCADE' },
    token:      { type: 'TEXT', notNull: true, unique: true },
    expires_at: { type: 'TIMESTAMPTZ', notNull: true },
    used:       { type: 'BOOLEAN', notNull: true, default: false },
    created_at: { type: 'TIMESTAMPTZ', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('password_reset_tokens', 'token');
  pgm.createIndex('password_reset_tokens', 'user_id');
};

exports.down = (pgm) => {
  pgm.dropTable('password_reset_tokens');
};
