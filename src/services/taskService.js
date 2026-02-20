/**
 * services/taskService.js
 * ─────────────────────────────────────────────────────────
 * Business-logic layer for tasks.
 *
 * Redis caching strategy
 * ──────────────────────
 * - GET /tasks  → cached under key `tasks:all` (or with query hash)
 * - GET /tasks/:id → cached under key `tasks:<id>`
 * - Any mutation (create / update / delete) invalidates the list
 *   cache so the next GET reflects the latest state.
 *
 * Why cache here?
 * The tasks list is the most-read endpoint. Caching avoids
 * hitting PostgreSQL on every request and brings response
 * times from ~5-20 ms down to < 1 ms for repeat reads.
 */

const TaskModel = require('../models/taskModel');
const AuditModel = require('../models/auditModel');
const redis = require('../config/redis');
const config = require('../config');
const { createError, ERROR_CODES } = require('../errors/codes');

// ── Cache key helpers ────────────────────────────────────
const CACHE_PREFIX = 'tasks';

function listKey(query) {
  // Deterministic key from query params
  const suffix = Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `${CACHE_PREFIX}:list:${suffix || 'all'}`;
}

function itemKey(id) {
  return `${CACHE_PREFIX}:${id}`;
}

// ── Service ──────────────────────────────────────────────
const TaskService = {
  async getAllTasks(query = {}) {
    const cacheKey = listKey(query);

    // 1. Try cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // Redis may be unreachable — proceed without cache
    }

    // 2. Query database (model returns { rows, total })
    const result = await TaskModel.findAll(query);

    // 3. Store in cache for next reads
    try {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', config.cacheTTL);
    } catch {
      // Non-critical — swallow
    }

    return result;
  },

  async getTaskById(id) {
    const cacheKey = itemKey(id);

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // proceed without cache
    }

    const task = await TaskModel.findById(id);
    if (!task) throw createError('Task not found', 404, ERROR_CODES.NOT_FOUND_TASK);

    try {
      await redis.set(cacheKey, JSON.stringify(task), 'EX', config.cacheTTL);
    } catch {
      // Non-critical
    }

    return task;
  },

  async createTask(data, actor) {
    if (!data.title || !data.userId) {
      throw createError('Title and userId are required', 400, ERROR_CODES.VALIDATION_FAILED);
    }
    const task = await TaskModel.create(data);
    if (actor) {
      AuditModel.log({ actorId: actor.id, actorEmail: actor.email, action: 'task.create',
        resource: 'task', resourceId: task.id, ip: actor._ip, requestId: actor._requestId });
    }
    await this._invalidateListCache();
    return task;
  },

  async updateTask(id, data, actor) {
    const task = await TaskModel.update(id, data);
    if (!task) throw createError('Task not found', 404, ERROR_CODES.NOT_FOUND_TASK);
    if (actor) {
      AuditModel.log({ actorId: actor.id, actorEmail: actor.email, action: 'task.update',
        resource: 'task', resourceId: id, ip: actor._ip, requestId: actor._requestId });
    }
    await this._invalidateItemCache(id);
    await this._invalidateListCache();
    return task;
  },

  async deleteTask(id, actor) {
    const deleted = await TaskModel.delete(id);
    if (!deleted) throw createError('Task not found', 404, ERROR_CODES.NOT_FOUND_TASK);
    if (actor) {
      AuditModel.log({ actorId: actor.id, actorEmail: actor.email, action: 'task.delete',
        resource: 'task', resourceId: id, ip: actor._ip, requestId: actor._requestId });
    }
    await this._invalidateItemCache(id);
    await this._invalidateListCache();
    return true;
  },

  // ── Cache invalidation helpers ─────────────────────────
  async _invalidateListCache() {
    try {
      // Remove all list-variant keys
      const keys = await redis.keys(`${CACHE_PREFIX}:list:*`);
      if (keys.length) await redis.del(...keys);
    } catch {
      // Non-critical
    }
  },

  async _invalidateItemCache(id) {
    try {
      await redis.del(itemKey(id));
    } catch {
      // Non-critical
    }
  },
};

module.exports = TaskService;
