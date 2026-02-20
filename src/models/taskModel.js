/**
 * models/taskModel.js
 * ─────────────────────────────────────────────────────────
 * Data-access layer for the `tasks` table.
 * Tasks belong to a user via the `user_id` foreign key.
 */

const pool = require('../config/database');

const TaskModel = {
  /**
   * Return all tasks, optionally filtered by user_id or status.
   */
  async findAll({ userId, status } = {}) {
    let query = `
      SELECT t.id, t.title, t.description, t.status,
             t.user_id, u.username AS user_name,
             t.created_at, t.updated_at
        FROM tasks t
        JOIN users u ON u.id = t.user_id
       WHERE 1 = 1`;
    const params = [];

    if (userId) {
      params.push(userId);
      query += ` AND t.user_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND t.status = $${params.length}`;
    }

    query += ` ORDER BY t.created_at DESC`;

    const { rows } = await pool.query(query, params);
    return rows;
  },

  /**
   * Retrieve a single task by primary key.
   */
  async findById(id) {
    const { rows } = await pool.query(
      `SELECT t.id, t.title, t.description, t.status,
              t.user_id, u.username AS user_name,
              t.created_at, t.updated_at
         FROM tasks t
         JOIN users u ON u.id = t.user_id
        WHERE t.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Insert a new task.
   */
  async create({ title, description, status = 'pending', userId }) {
    const { rows } = await pool.query(
      `INSERT INTO tasks (title, description, status, user_id)
            VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, status, user_id, created_at, updated_at`,
      [title, description, status, userId]
    );
    return rows[0];
  },

  /**
   * Update mutable task fields.
   */
  async update(id, { title, description, status }) {
    const { rows } = await pool.query(
      `UPDATE tasks
          SET title       = COALESCE($1, title),
              description = COALESCE($2, description),
              status      = COALESCE($3, status),
              updated_at  = NOW()
        WHERE id = $4
    RETURNING id, title, description, status, user_id, created_at, updated_at`,
      [title, description, status, id]
    );
    return rows[0] || null;
  },

  /**
   * Hard-delete a task by id.
   */
  async delete(id) {
    const { rowCount } = await pool.query(
      `DELETE FROM tasks WHERE id = $1`,
      [id]
    );
    return rowCount > 0;
  },
};

module.exports = TaskModel;
