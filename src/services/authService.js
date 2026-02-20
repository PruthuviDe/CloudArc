/**
 * services/authService.js
 * ─────────────────────────────────────────────────────────
 * Business logic for registration and login.
 * Password hashing lives here (never in the model/controller).
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const AuthModel = require('../models/authModel');
const RefreshTokenModel = require('../models/refreshTokenModel');
const PasswordResetModel = require('../models/passwordResetModel');
const { sendMail } = require('../config/mailer');
const { createError, ERROR_CODES } = require('../errors/codes');
const config = require('../config');

const SALT_ROUNDS = 12;

const AuthService = {
  /**
   * Register a new user.
   * Throws 409 if email or username already exists.
   */
  async register({ username, email, password }) {
    const [existingEmail, existingUsername] = await Promise.all([
      AuthModel.findByEmail(email),
      AuthModel.findByUsername(username),
    ]);

    if (existingEmail) {
      throw createError('Email is already registered', 409, ERROR_CODES.AUTH_EMAIL_TAKEN);
    }
    if (existingUsername) {
      throw createError('Username is already taken', 409, ERROR_CODES.AUTH_USERNAME_TAKEN);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await AuthModel.create({ username, email, passwordHash });

    const accessToken  = AuthService._signAccessToken(user);
    const refreshToken = await AuthService._createRefreshToken(user.id);
    return { user, accessToken, refreshToken };
  },

  /**
   * Login with email + password.
   * Returns both an access token (short-lived) and refresh token (long-lived).
   */
  async login({ email, password }) {
    const user = await AuthModel.findByEmail(email);

    // Compare even if user not found to prevent timing attacks
    const hash = user ? user.password_hash : '$2a$12$invalidhashpadding000000000000000000000000000000000000000';
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid) {
      throw createError('Invalid email or password', 401, ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }

    const { password_hash: _, ...safeUser } = user;
    const accessToken  = AuthService._signAccessToken(safeUser);
    const refreshToken = await AuthService._createRefreshToken(safeUser.id);
    return { user: safeUser, accessToken, refreshToken };
  },

  /**
   * Exchange a valid refresh token for a new access + refresh token pair.
   * Old refresh token is revoked (rotation).
   * If a revoked token is presented the entire family is revoked (reuse detection).
   */
  async refresh(rawToken) {
    // 1. Verify JWT signature + expiry
    let payload;
    try {
      payload = jwt.verify(rawToken, config.jwt.refreshSecret);
    } catch {
      throw createError('Invalid or expired refresh token', 401, ERROR_CODES.AUTH_TOKEN_INVALID);
    }

    // 2. Look up in DB
    const stored = await RefreshTokenModel.findByToken(rawToken);
    if (!stored) {
      throw createError('Refresh token not found', 401, ERROR_CODES.AUTH_TOKEN_INVALID);
    }

    // 3. Reuse detection — token was already revoked
    if (stored.revoked) {
      await RefreshTokenModel.revokeFamily(stored.family);
      throw createError('Refresh token reuse detected — all sessions revoked', 401, ERROR_CODES.AUTH_TOKEN_REUSE);
    }

    // 4. Revoke the used token
    await RefreshTokenModel.revoke(rawToken);

    // 5. Fetch fresh user data and issue new tokens
    const user = await AuthModel.findById(payload.id);
    if (!user) {
      throw createError('User not found', 401, ERROR_CODES.AUTH_TOKEN_INVALID);
    }

    const { password_hash: _, ...safeUser } = user;
    const accessToken     = AuthService._signAccessToken(safeUser);
    // New refresh token inherits the same family (session continuity)
    const newRefreshToken = await AuthService._createRefreshToken(safeUser.id, stored.family);
    return { user: safeUser, accessToken, refreshToken: newRefreshToken };
  },

  /** Revoke a single refresh token (logout from current device). */
  async logout(rawToken) {
    await RefreshTokenModel.revoke(rawToken);
  },

  /** Revoke all refresh tokens for a user (logout from all devices). */
  async logoutAll(userId) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
      [userId]
    );
  },

  /**
   * Initiate password reset.
   * Always resolves (no email enumeration) — caller sends a generic response.
   */
  async forgotPassword(email) {
    const user = await AuthModel.findIdByEmail(email);
    if (!user) return; // silently ignore unknown emails

    // Invalidate any previous unused tokens for this user
    await PasswordResetModel.invalidateAllForUser(user.id);

    // Generate a cryptographically random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + config.passwordResetTTL * 60 * 1000);

    await PasswordResetModel.create({ userId: user.id, token: rawToken, expiresAt });

    const resetUrl = `${process.env.FRONTEND_URL || 'https://cloudsarc.site'}/reset-password?token=${rawToken}`;

    await sendMail({
      to:      email,
      subject: 'CloudArc — Password Reset',
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your CloudArc password.
           This link expires in ${config.passwordResetTTL} minutes.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you did not request this, ignore this email.</p>
      `,
      text: `Reset your password: ${resetUrl}\n\nExpires in ${config.passwordResetTTL} minutes.`,
    });
  },

  /**
   * Complete password reset with a valid token + new password.
   * Throws 400 if token is invalid, expired, or already used.
   */
  async resetPassword({ token, password }) {
    const record = await PasswordResetModel.findValidByToken(token);
    if (!record) {
      throw createError('Invalid or expired reset token', 400, ERROR_CODES.AUTH_RESET_TOKEN_INVALID);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await AuthModel.updatePassword(record.user_id, passwordHash);
    await PasswordResetModel.markUsed(token);

    // Revoke all refresh tokens — force re-login on all devices
    await pool.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
      [record.user_id]
    );
  },

  // ── Private helpers ─────────────────────────────────────

  /** Short-lived access token (15 min default). Includes role for RBAC. */
  _signAccessToken(user) {
    return jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role || 'user' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  },

  /** Creates, persists, and returns a signed refresh token. */
  async _createRefreshToken(userId, family = uuidv4()) {
    const expiresIn = config.jwt.refreshExpiresIn; // e.g. '7d'
    const ms  = parseDuration(expiresIn);
    const expiresAt = new Date(Date.now() + ms);

    // opaque random token signed with refresh secret
    const raw = crypto.randomBytes(40).toString('hex');
    const token = jwt.sign({ id: userId, jti: raw }, config.jwt.refreshSecret, { expiresIn });

    await RefreshTokenModel.create({ token, userId, family, expiresAt });
    return token;
  },
};

/** Convert a duration string like '7d', '15m', '1h' to milliseconds. */
function parseDuration(s) {
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const match = String(s).match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 86400000; // default 7d
  return parseInt(match[1], 10) * units[match[2]];
}

module.exports = AuthService;
