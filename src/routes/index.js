/**
 * routes/index.js
 * ─────────────────────────────────────────────────────────
 * Aggregates all resource routers under the /api prefix.
 * Adding a new resource is a one-liner here.
 */

const { Router } = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const taskRoutes = require('./taskRoutes');

const router = Router();

// v1 router — canonical paths
const v1 = Router();
v1.use('/auth',  authRoutes);
v1.use('/users', userRoutes);
v1.use('/tasks', taskRoutes);

router.use('/v1', v1);  // /api/v1/...
router.use('/', v1);    // /api/...  (backward-compat alias)

module.exports = router;
