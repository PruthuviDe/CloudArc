/**
 * controllers/userController.js
 * ─────────────────────────────────────────────────────────
 * Handles HTTP request/response for user endpoints.
 * Delegates business logic to UserService and maps results
 * to standard JSON responses.
 */

const UserService = require('../services/userService');

const UserController = {
  // GET /api/users
  async getAll(req, res, next) {
    try {
      const users = await UserService.getAllUsers();
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/users/:id
  async getById(req, res, next) {
    try {
      const user = await UserService.getUserById(req.params.id);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/users
  async create(req, res, next) {
    try {
      const user = await UserService.createUser(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/users/:id
  async update(req, res, next) {
    try {
      const user = await UserService.updateUser(req.params.id, req.body);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/users/:id
  async delete(req, res, next) {
    try {
      await UserService.deleteUser(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};

module.exports = UserController;
