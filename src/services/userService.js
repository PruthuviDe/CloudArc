/**
 * services/userService.js
 * ─────────────────────────────────────────────────────────
 * Business-logic layer for users.
 * Orchestrates model calls, applies validation rules, and
 * keeps controllers thin.
 */

const UserModel = require('../models/userModel');

const UserService = {
  async getAllUsers({ limit, offset } = {}) {
    return UserModel.findAll({ limit, offset });
  },

  async getUserById(id) {
    const user = await UserModel.findById(id);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return user;
  },

  async createUser(data) {
    if (!data.username || !data.email) {
      const error = new Error('Username and email are required');
      error.statusCode = 400;
      throw error;
    }
    return UserModel.create(data);
  },

  async updateUser(id, data) {
    const user = await UserModel.update(id, data);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return user;
  },

  async deleteUser(id) {
    const deleted = await UserModel.delete(id);
    if (!deleted) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return true;
  },
};

module.exports = UserService;
