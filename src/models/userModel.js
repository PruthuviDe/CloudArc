/**
 * models/userModel.js
 * ─────────────────────────────────────────────────────────
 * Data-access layer for the `users` table.
 * All raw SQL lives here — the rest of the app works with
 * plain JavaScript objects returned by these functions.
 */

const pool = require('../config/database');

const UserModel = {
  /**
   * Retrieve a paginated list of users.
   * Returns rows + total count for building pagination metadata.
   */
  async findAll({ limit = 20, offset = 0 } = {}) {
    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query(
        `SELECT id, username, email, created_at, updated_at
           FROM users
          ORDER BY created_at DESC
          LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT COUNT(*) AS total FROM users`),
    ]);
    return { rows, total: parseInt(countRows[0].total, 10) };
  },

  /**
   * Retrieve a single user by primary key.
   */
  async findById(id) {
    const { rows } = await pool.query(
      `SELECT id, username, email, created_at, updated_at
         FROM users
        WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Insert a new user and return the created record.
   */
  async create({ username, email }) {
    const { rows } = await pool.query(
      `INSERT INTO users (username, email)
            VALUES ($1, $2)
       RETURNING id, username, email, created_at, updated_at`,
      [username, email]
    );
    return rows[0];
  },

  /**
   * Update an existing user. Only touches provided fields.
   */
  async update(id, { username, email }) {
    const { rows } = await pool.query(
      `UPDATE users
          SET username   = COALESCE($1, username),
              email      = COALESCE($2, email),
              updated_at = NOW()
        WHERE id = $3
    RETURNING id, username, email, created_at, updated_at`,
      [username, email, id]
    );
    return rows[0] || null;
  },

  /**
   * Hard-delete a user by id. Returns true if a row was removed.
   */
  async delete(id) {
    const { rowCount } = await pool.query(
      `DELETE FROM users WHERE id = $1`,
      [id]
    );
    return rowCount > 0;
  },
};

module.exports = UserModel;
