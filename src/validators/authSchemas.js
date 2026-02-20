/**
 * validators/authSchemas.js
 * ─────────────────────────────────────────────────────────
 * Joi schemas for POST /api/auth/register and /api/auth/login.
 */

const Joi = require('joi');

const passwordRules = Joi.string()
  .min(8)
  .max(72) // bcrypt silently truncates beyond 72 chars
  .pattern(/[A-Z]/, 'one uppercase letter')
  .pattern(/[0-9]/, 'one number')
  .required();

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().lowercase().required(),
  password: passwordRules,
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const logoutSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema, refreshSchema, logoutSchema };
