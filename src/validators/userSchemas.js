/**
 * validators/userSchemas.js
 * ─────────────────────────────────────────────────────────
 * Joi schemas for user CRUD endpoints.
 */

const Joi = require('joi');

/** POST /api/users — create */
const createUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().lowercase().required(),
});

/** PUT /api/users/:id — update (all fields optional, but at least one) */
const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30),
  email: Joi.string().email().lowercase(),
}).min(1); // require at least one field

module.exports = { createUserSchema, updateUserSchema };
