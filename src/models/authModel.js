/**
 * models/authModel.js
 * ─────────────────────────────────────────────────────────
 * Data-access for auth-specific queries.
 * Includes password_hash in SELECT — never exposed to the client.
 * UserModel deliberately excludes it for safety.
 */

const pool = require('../config/database');

const AuthModel = {
  /**
   * Find a user by email and include password_hash for comparison.
   */
  async findByEmail(email) {
    const { rows } = await pool.query(
      `SELECT id, username, email, password_hash, role, created_at
         FROM users
        WHERE email = $1`,
      [email]
    );
    return rows[0] || null;
  },

  /**
   * Find a user by username (uniqueness check on register).
   */
  async findByUsername(username) {
    const { rows } = await pool.query(
      `SELECT id FROM users WHERE username = $1`,
      [username]
    );
    return rows[0] || null;
  },

  /**
   * Find a user by id (used in refresh token rotation).
   */
  async findById(id) {
    const { rows } = await pool.query(
      `SELECT id, username, email, password_hash, role, created_at
         FROM users
        WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Create a user with a hashed password.
   */
  async create({ username, email, passwordHash }) {
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
       RETURNING id, username, email, role, created_at`,
      [username, email, passwordHash]
    );
    return rows[0];
  },

  /**
   * Update a user's password hash (used after password reset).
   */
  async updatePassword(userId, passwordHash) {
    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, userId]
    );
  },

  /**
   * Find a user by email (plain — for password reset lookup, no hash needed).
   */
  async findIdByEmail(email) {
    const { rows } = await pool.query(
      `SELECT id, username, email FROM users WHERE email = $1`,
      [email]
    );
    return rows[0] || null;
  },
};

module.exports = AuthModel;
