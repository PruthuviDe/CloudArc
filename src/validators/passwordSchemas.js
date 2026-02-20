/**
 * validators/passwordSchemas.js
 * ─────────────────────────────────────────────────────────
 * Joi schemas for password-reset endpoints.
 */

const Joi = require('joi');

const passwordRules = Joi.string()
  .min(8)
  .max(72)
  .pattern(/[A-Z]/, 'one uppercase letter')
  .pattern(/[0-9]/, 'one number')
  .required();

/** POST /auth/forgot-password */
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

/** POST /auth/reset-password */
const resetPasswordSchema = Joi.object({
  token:    Joi.string().required(),
  password: passwordRules,
});

module.exports = { forgotPasswordSchema, resetPasswordSchema };
