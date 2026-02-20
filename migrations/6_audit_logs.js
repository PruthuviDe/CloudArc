/**
 * migrations/6_audit_logs.js
 * Immutable append-only audit trail for destructive actions.
 */

exports.up = (pgm) => {
  pgm.createTable('audit_logs', {
    id:          { type: 'BIGSERIAL', primaryKey: true },
    actor_id:    { type: 'INTEGER', references: '"users"', onDelete: 'SET NULL' },
    actor_email: { type: 'VARCHAR(255)' },   // denormalised — survives user deletion
    action:      { type: 'VARCHAR(100)', notNull: true }, // e.g. 'user.delete'
    resource:    { type: 'VARCHAR(100)', notNull: true }, // e.g. 'user'
    resource_id: { type: 'VARCHAR(100)' },               // the affected record id
    metadata:    { type: 'JSONB' },                      // extra context
    ip:          { type: 'VARCHAR(45)' },
    request_id:  { type: 'VARCHAR(36)' },
    created_at:  { type: 'TIMESTAMPTZ', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('audit_logs', 'actor_id');
  pgm.createIndex('audit_logs', 'action');
  pgm.createIndex('audit_logs', 'resource_id');
  pgm.createIndex('audit_logs', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('audit_logs');
};
