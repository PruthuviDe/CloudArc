/**
 * controllers/authController.js
 * ─────────────────────────────────────────────────────────
 * Thin HTTP handlers for auth endpoints.
 * Business logic lives in AuthService.
 */

const AuthService = require('../services/authService');

const AuthController = {
  // POST /api/v1/auth/register
  async register(req, res, next) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.register(req.body);
      res.status(201).json({ success: true, data: { user, accessToken, refreshToken } });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/login
  async login(req, res, next) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.login(req.body);
      res.json({ success: true, data: { user, accessToken, refreshToken } });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/refresh
  // Body: { refreshToken: "<token>" }
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refresh(refreshToken);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/logout
  // Body: { refreshToken: "<token>" } — revokes current device session.
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      await AuthService.logout(refreshToken);
      res.json({ success: true, message: 'Logged out' });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/logout-all  (requires valid access token)
  // Revokes ALL refresh tokens for the authenticated user.
  async logoutAll(req, res, next) {
    try {
      await AuthService.logoutAll(req.user.id);
      res.json({ success: true, message: 'Logged out from all devices' });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/forgot-password
  // Always returns 200 regardless of whether the email exists (prevents enumeration).
  async forgotPassword(req, res, next) {
    try {
      await AuthService.forgotPassword(req.body.email);
      res.json({ success: true, message: 'If that email is registered you will receive a reset link shortly.' });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/reset-password
  async resetPassword(req, res, next) {
    try {
      await AuthService.resetPassword(req.body);
      res.json({ success: true, message: 'Password updated. Please log in again.' });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = AuthController;
