/**
 * validators/taskSchemas.js
 * ─────────────────────────────────────────────────────────
 * Joi schemas for task CRUD endpoints.
 */

const Joi = require('joi');

const TASK_STATUSES = ['pending', 'in_progress', 'completed'];

/** POST /api/tasks — create */
const createTaskSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(2000).allow('', null).optional(),
  status: Joi.string().valid(...TASK_STATUSES).default('pending'),
  user_id: Joi.number().integer().positive().required(),
});

/** PUT /api/tasks/:id — update */
const updateTaskSchema = Joi.object({
  title: Joi.string().min(1).max(255),
  description: Joi.string().max(2000).allow('', null),
  status: Joi.string().valid(...TASK_STATUSES),
  user_id: Joi.number().integer().positive(),
}).min(1);

module.exports = { createTaskSchema, updateTaskSchema };
