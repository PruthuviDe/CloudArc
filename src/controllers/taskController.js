/**
 * controllers/taskController.js
 * ─────────────────────────────────────────────────────────
 * Handles HTTP request/response for task endpoints.
 */

const TaskService = require('../services/taskService');

const TaskController = {
  // GET /api/tasks
  async getAll(req, res, next) {
    try {
      const { userId, status } = req.query;
      const tasks = await TaskService.getAllTasks({ userId, status });
      res.json({ success: true, data: tasks });
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
      const task = await TaskService.createTask(req.body);
      res.status(201).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/tasks/:id
  async update(req, res, next) {
    try {
      const task = await TaskService.updateTask(req.params.id, req.body);
      res.json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/tasks/:id
  async delete(req, res, next) {
    try {
      await TaskService.deleteTask(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};

module.exports = TaskController;
