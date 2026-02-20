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
      `SELECT id, username, email, password_hash, created_at
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
   * Create a user with a hashed password.
   */
  async create({ username, email, passwordHash }) {
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username, email, passwordHash]
    );
    return rows[0];
  },
};

module.exports = AuthModel;
