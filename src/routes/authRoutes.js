/**
 * routes/authRoutes.js
 * ─────────────────────────────────────────────────────────
 * Public endpoints — no JWT required.
 *
 *   POST /api/auth/register
 *   POST /api/auth/login
 */

const { Router } = require('express');
const AuthController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/authSchemas');

const router = Router();

router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login',    validate(loginSchema),    AuthController.login);

module.exports = router;
