/**
 * middleware/requireRole.js
 * ─────────────────────────────────────────────────────────
 * RBAC middleware factory.
 * Must be used AFTER the `authenticate` middleware (which sets req.user).
 *
 * Usage:
 *   const requireRole = require('./requireRole');
 *   router.delete('/users/:id', authenticate, requireRole('admin'), handler);
 *   router.get('/reports',      authenticate, requireRole('admin', 'manager'), handler);
 */

/**
 * Returns an Express middleware that tests whether req.user.role
 * is in the allowed roles list.
 *
 * @param {...string} roles  One or more allowed role strings (e.g. 'admin')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      return next(err);
    }

    if (!roles.includes(req.user.role)) {
      const err = new Error(`Access denied — requires role: ${roles.join(' or ')}`);
      err.statusCode = 403;
      return next(err);
    }

    next();
  };
}

module.exports = requireRole;
