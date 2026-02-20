/**
 * migrations/7_api_keys.js
 * Hashed API keys for machine-to-machine auth via X-API-Key header.
 */

exports.up = (pgm) => {
  pgm.createTable('api_keys', {
    id:           { type: 'SERIAL', primaryKey: true },
    user_id:      { type: 'INTEGER', notNull: true, references: '"users"', onDelete: 'CASCADE' },
    name:         { type: 'VARCHAR(100)', notNull: true },       // human label
    key_hash:     { type: 'VARCHAR(255)', notNull: true, unique: true }, // bcrypt hash
    key_prefix:   { type: 'VARCHAR(10)', notNull: true },        // first 8 chars for lookup
    last_used_at: { type: 'TIMESTAMPTZ' },
    expires_at:   { type: 'TIMESTAMPTZ' },
    revoked:      { type: 'BOOLEAN', notNull: true, default: false },
    created_at:   { type: 'TIMESTAMPTZ', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('api_keys', 'key_prefix');
  pgm.createIndex('api_keys', 'user_id');
};

exports.down = (pgm) => {
  pgm.dropTable('api_keys');
};
