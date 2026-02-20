/**
 * models/passwordResetModel.js
 * ─────────────────────────────────────────────────────────
 * Data-access layer for password_reset_tokens table.
 */

const pool = require('../config/database');

const PasswordResetModel = {
  /**
   * Persist a new reset token.
   */
  async create({ userId, token, expiresAt }) {
    const { rows } = await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
       RETURNING id, token, expires_at`,
      [userId, token, expiresAt]
    );
    return rows[0];
  },

  /**
   * Find an unexpired, unused token.
   * Returns null if not found, expired, or already used.
   */
  async findValidByToken(token) {
    const { rows } = await pool.query(
      `SELECT id, user_id, token, expires_at, used
         FROM password_reset_tokens
        WHERE token = $1
          AND used = FALSE
          AND expires_at > NOW()`,
      [token]
    );
    return rows[0] || null;
  },

  /**
   * Mark a token as used (consumed after password reset).
   */
  async markUsed(token) {
    await pool.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE token = $1`,
      [token]
    );
  },

  /**
   * Invalidate all unused tokens for a user (issued before this reset).
   */
  async invalidateAllForUser(userId) {
    await pool.query(
      `UPDATE password_reset_tokens
          SET used = TRUE
        WHERE user_id = $1 AND used = FALSE`,
      [userId]
    );
  },

  /**
   * Housekeeping — delete expired tokens.
   */
  async deleteExpired() {
    const { rowCount } = await pool.query(
      `DELETE FROM password_reset_tokens WHERE expires_at < NOW()`
    );
    return rowCount;
  },
};

module.exports = PasswordResetModel;
