/**
 * controllers/authController.js
 * ─────────────────────────────────────────────────────────
 * Thin HTTP handlers for auth endpoints.
 * Business logic lives in AuthService.
 */

const AuthService = require('../services/authService');

const AuthController = {
  // POST /api/auth/register
  async register(req, res, next) {
    try {
      const { user, token } = await AuthService.register(req.body);
      res.status(201).json({ success: true, data: { user, token } });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const { user, token } = await AuthService.login(req.body);
      res.json({ success: true, data: { user, token } });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = AuthController;
