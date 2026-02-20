/**
 * models/apiKeyModel.js
 * ─────────────────────────────────────────────────────────
 * Data-access for api_keys table.
 * Raw keys are NEVER stored — only bcrypt hashes.
 */

const pool = require('../config/database');

const ApiKeyModel = {
  /**
   * Persist a new API key (already hashed by service layer).
   */
  async create({ userId, name, keyHash, keyPrefix, expiresAt }) {
    const { rows } = await pool.query(
      `INSERT INTO api_keys (user_id, name, key_hash, key_prefix, expires_at)
            VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, name, key_prefix, expires_at, created_at`,
      [userId, name, keyHash, keyPrefix, expiresAt || null]
    );
    return rows[0];
  },

  /**
   * Find active keys matching the given 8-char prefix.
   * Returns multiple rows — caller must bcrypt-compare each.
   */
  async findByPrefix(prefix) {
    const { rows } = await pool.query(
      `SELECT id, user_id, name, key_hash, key_prefix, expires_at, revoked, last_used_at
         FROM api_keys
        WHERE key_prefix = $1
          AND revoked = FALSE`,
      [prefix]
    );
    return rows;
  },

  /**
   * After a successful match, update last_used_at.
   */
  async touch(id) {
    await pool.query(
      `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
      [id]
    );
  },

  /**
   * Revoke a key by id (must belong to userId).
   */
  async revoke(id, userId) {
    const { rowCount } = await pool.query(
      `UPDATE api_keys SET revoked = TRUE
        WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rowCount > 0;
  },

  /**
   * List keys for a user (without hashes).
   */
  async listForUser(userId) {
    const { rows } = await pool.query(
      `SELECT id, name, key_prefix, expires_at, revoked, last_used_at, created_at
         FROM api_keys
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  },
};

module.exports = ApiKeyModel;
