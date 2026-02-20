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
      const err = new Error('Email is already registered');
      err.statusCode = 409;
      throw err;
    }
    if (existingUsername) {
      const err = new Error('Username is already taken');
      err.statusCode = 409;
      throw err;
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
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
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
      const err = new Error('Invalid or expired refresh token');
      err.statusCode = 401;
      throw err;
    }

    // 2. Look up in DB
    const stored = await RefreshTokenModel.findByToken(rawToken);
    if (!stored) {
      const err = new Error('Refresh token not found');
      err.statusCode = 401;
      throw err;
    }

    // 3. Reuse detection — token was already revoked
    if (stored.revoked) {
      await RefreshTokenModel.revokeFamily(stored.family);
      const err = new Error('Refresh token reuse detected — all sessions revoked');
      err.statusCode = 401;
      throw err;
    }

    // 4. Revoke the used token
    await RefreshTokenModel.revoke(rawToken);

    // 5. Fetch fresh user data and issue new tokens
    const user = await AuthModel.findById(payload.id);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 401;
      throw err;
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

  // ── Private helpers ─────────────────────────────────────

  /** Short-lived access token (15 min default). */
  _signAccessToken(user) {
    return jwt.sign(
      { id: user.id, username: user.username, email: user.email },
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
