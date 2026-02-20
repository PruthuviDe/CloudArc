/**
 * controllers/taskController.js
 * ─────────────────────────────────────────────────────────
 * Handles HTTP request/response for task endpoints.
 */

const TaskService = require('../services/taskService');

// ── Pagination helper ────────────────────────────────────
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

const TaskController = {
  // GET /api/v1/tasks?page=1&limit=20&userId=1&status=pending
  async getAll(req, res, next) {
    try {
      const { userId, status } = req.query;
      const { page, limit, offset } = parsePagination(req.query);
      const { rows, total } = await TaskService.getAllTasks({ userId, status, limit, offset });
      const pages = Math.ceil(total / limit);
      res.json({
        success: true,
        data: rows,
        pagination: {
          total,
          page,
          limit,
          pages,
          next: page < pages ? page + 1 : null,
          prev: page > 1    ? page - 1 : null,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/tasks/:id
  async getById(req, res, next) {
    try {
      const task = await TaskService.getTaskById(req.params.id);
      res.json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/tasks
  async create(req, res, next) {
    try {
      const actor = { id: req.user.id, email: req.user.email, _ip: req.ip, _requestId: req.requestId };
      const task = await TaskService.createTask(req.body, actor);
      res.status(201).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/tasks/:id
  async update(req, res, next) {
    try {
      const actor = { id: req.user.id, email: req.user.email, _ip: req.ip, _requestId: req.requestId };
      const task = await TaskService.updateTask(req.params.id, req.body, actor);
      res.json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/tasks/:id
  async delete(req, res, next) {
    try {
      const actor = { id: req.user.id, email: req.user.email, _ip: req.ip, _requestId: req.requestId };
      await TaskService.deleteTask(req.params.id, actor);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};

module.exports = TaskController;
