/**
 * models/refreshTokenModel.js
 * ─────────────────────────────────────────────────────────
 * Data-access layer for the refresh_tokens table.
 *
 * Token rotation pattern
 * ──────────────────────
 * 1. Login  → create a new token + family UUID
 * 2. Refresh → verify old token, revoke it, issue new token
 *              in the SAME family
 * 3. Reuse detection → if a revoked token is presented,
 *              revoke the ENTIRE family (session hijack)
 * 4. Logout  → revoke the single token (or entire family
 *              for "log out everywhere")
 */

const pool = require('../config/database');

const RefreshTokenModel = {
  /** Persist a new refresh token. */
  async create({ token, userId, family, expiresAt }) {
    const { rows } = await pool.query(
      `INSERT INTO refresh_tokens (token, user_id, family, expires_at)
            VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [token, userId, family, expiresAt]
    );
    return rows[0];
  },

  /** Find a token row by the raw token string. */
  async findByToken(token) {
    const { rows } = await pool.query(
      `SELECT * FROM refresh_tokens WHERE token = $1`,
      [token]
    );
    return rows[0] || null;
  },

  /** Mark a single token as revoked. */
  async revoke(token) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1`,
      [token]
    );
  },

  /**
   * Revoke every token in a family.
   * Called on reuse detection to invalidate a stolen session.
   */
  async revokeFamily(family) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE family = $1`,
      [family]
    );
  },

  /** Remove expired tokens (run periodically or on startup). */
  async deleteExpired() {
    const { rowCount } = await pool.query(
      `DELETE FROM refresh_tokens WHERE expires_at < NOW()`
    );
    return rowCount;
  },
};

module.exports = RefreshTokenModel;
