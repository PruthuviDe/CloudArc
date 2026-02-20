/**
 * models/taskModel.js
 * ─────────────────────────────────────────────────────────
 * Data-access layer for the `tasks` table.
 * Tasks belong to a user via the `user_id` foreign key.
 */

const pool = require('../config/database');

const TaskModel = {
  /**
   * Return paginated tasks, optionally filtered by user_id or status.
   * Returns rows + total count for building pagination metadata.
   */
  async findAll({ userId, status, limit = 20, offset = 0 } = {}) {
    let dataQuery = `
      SELECT t.id, t.title, t.description, t.status,
             t.user_id, u.username AS user_name,
             t.created_at, t.updated_at
        FROM tasks t
        JOIN users u ON u.id = t.user_id
       WHERE 1 = 1`;
    let countQuery = `SELECT COUNT(*) AS total FROM tasks t WHERE 1 = 1`;
    const params = [];

    if (userId) {
      params.push(userId);
      const cond = ` AND t.user_id = $${params.length}`;
      dataQuery  += cond;
      countQuery += cond;
    }
    if (status) {
      params.push(status);
      const cond = ` AND t.status = $${params.length}`;
      dataQuery  += cond;
      countQuery += cond;
    }

    params.push(limit);
    dataQuery += ` ORDER BY t.created_at DESC LIMIT $${params.length}`;
    params.push(offset);
    dataQuery += ` OFFSET $${params.length}`;

    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(countQuery, params.slice(0, params.length - 2)), // without limit/offset
    ]);
    return { rows, total: parseInt(countRows[0].total, 10) };
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
