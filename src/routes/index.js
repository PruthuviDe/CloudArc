/**
 * routes/index.js
 * ─────────────────────────────────────────────────────────
 * Aggregates all resource routers under the /api prefix.
 * Adding a new resource is a one-liner here.
 */

const { Router } = require('express');
const authRoutes   = require('./authRoutes');
const userRoutes   = require('./userRoutes');
const taskRoutes   = require('./taskRoutes');
const apiKeyRoutes = require('./apiKeyRoutes');
const authenticate = require('../middleware/authenticate');
const requireRole  = require('../middleware/requireRole');
const { apiLimiter } = require('../middleware/rateLimiter');
const UserModel    = require('../models/userModel');
const AuditModel   = require('../models/auditModel');

const router = Router();

// v1 router — canonical paths
const v1 = Router();
v1.use('/auth',     authRoutes);
v1.use('/users',    apiLimiter, userRoutes);
v1.use('/tasks',    apiLimiter, taskRoutes);
v1.use('/api-keys', apiLimiter, apiKeyRoutes);

// ── Admin-only routes (/api/v1/admin) ────────────────────
const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));

// GET /api/v1/admin/audit-logs — paginated audit trail
adminRouter.get('/audit-logs', async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { rows, total } = await AuditModel.findAll({
      actorId: req.query.actorId || null,
      action:  req.query.action  || null,
      limit,
      offset,
    });
    const pages = Math.ceil(total / limit);
    res.json({
      success: true,
      data: rows,
      pagination: { total, page, limit, pages, next: page < pages ? page + 1 : null, prev: page > 1 ? page - 1 : null },
    });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/users — full user list with pagination
adminRouter.get('/users', async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { rows, total } = await UserModel.findAll({ limit, offset });
    const pages = Math.ceil(total / limit);
    res.json({
      success: true,
      data: rows,
      pagination: { total, page, limit, pages, next: page < pages ? page + 1 : null, prev: page > 1 ? page - 1 : null },
    });
  } catch (err) { next(err); }
});

v1.use('/admin', adminRouter);

router.use('/v1', v1);  // /api/v1/...
router.use('/', v1);    // /api/...  (backward-compat alias)

module.exports = router;
