/**
 * routes/index.js
 * ─────────────────────────────────────────────────────────
 * Aggregates all resource routers under the /api prefix.
 * Adding a new resource is a one-liner here.
 */

const { Router } = require('express');
const userRoutes = require('./userRoutes');
const taskRoutes = require('./taskRoutes');

const router = Router();

router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);

module.exports = router;
