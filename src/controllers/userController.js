/**
 * controllers/userController.js
 * ─────────────────────────────────────────────────────────
 * Handles HTTP request/response for user endpoints.
 * Delegates business logic to UserService and maps results
 * to standard JSON responses.
 */

const UserService = require('../services/userService');

// ── Pagination helper ────────────────────────────────────
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

const UserController = {
  // GET /api/v1/users?page=1&limit=20
  async getAll(req, res, next) {
    try {
      const { page, limit, offset } = parsePagination(req.query);
      const { rows, total } = await UserService.getAllUsers({ limit, offset });
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
