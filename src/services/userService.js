/**
 * services/userService.js
 * ─────────────────────────────────────────────────────────
 * Business-logic layer for users.
 * Orchestrates model calls, applies validation rules, and
 * keeps controllers thin.
 */

const UserModel = require('../models/userModel');
const AuditModel = require('../models/auditModel');
const { createError, ERROR_CODES } = require('../errors/codes');

const UserService = {
  async getAllUsers({ limit, offset } = {}) {
    return UserModel.findAll({ limit, offset });
  },

  async getUserById(id) {
    const user = await UserModel.findById(id);
    if (!user) throw createError('User not found', 404, ERROR_CODES.NOT_FOUND_USER);
    return user;
  },

  async createUser(data) {
    if (!data.username || !data.email) {
      throw createError('Username and email are required', 400, ERROR_CODES.VALIDATION_FAILED);
    }
    return UserModel.create(data);
  },

  async updateUser(id, data, actor) {
    const user = await UserModel.update(id, data);
    if (!user) throw createError('User not found', 404, ERROR_CODES.NOT_FOUND_USER);
    if (actor) {
      AuditModel.log({ actorId: actor.id, actorEmail: actor.email, action: 'user.update',
        resource: 'user', resourceId: id, ip: actor._ip, requestId: actor._requestId });
    }
    return user;
  },

  async deleteUser(id, actor) {
    const deleted = await UserModel.delete(id);
    if (!deleted) throw createError('User not found', 404, ERROR_CODES.NOT_FOUND_USER);
    if (actor) {
      AuditModel.log({ actorId: actor.id, actorEmail: actor.email, action: 'user.delete',
        resource: 'user', resourceId: id, ip: actor._ip, requestId: actor._requestId });
    }
    return true;
  },
};

module.exports = UserService;
