/**
 * migrations/4_rbac.js
 * ─────────────────────────────────────────────────────────
 * Adds a `role` column to the users table for RBAC.
 * Roles: 'user' (default) | 'admin'
 */

exports.up = (pgm) => {
  pgm.addColumn('users', {
    role: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'user',
    },
  });

  // Mark the first user as admin (convenient for bootstrapping)
  pgm.sql(`UPDATE users SET role = 'admin' WHERE id = 1`);
};

exports.down = (pgm) => {
  pgm.dropColumn('users', 'role');
};
