/**
 * services/apiKeyService.js
 * ─────────────────────────────────────────────────────────
 * Business logic for API key management.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const ApiKeyModel = require('../models/apiKeyModel');
const { createError, ERROR_CODES } = require('../errors/codes');

const SALT_ROUNDS = 10; // lower than passwords — keys are long random strings

const ApiKeyService = {
  /**
   * Generate a new API key for a user.
   * Returns the plaintext key ONCE — it is never retrievable again.
   */
  async create({ userId, name, expiresInDays }) {
    const secret    = crypto.randomBytes(32).toString('hex'); // 64 hex chars
    const rawKey    = `cloudarc_${secret}`;
    const keyPrefix = secret.slice(0, 8);
    const keyHash   = await bcrypt.hash(secret, SALT_ROUNDS);

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 86400000)
      : null;

    const record = await ApiKeyModel.create({ userId, name, keyHash, keyPrefix, expiresAt });

    return { ...record, key: rawKey }; // key shown only on creation
  },

  /** List all keys for a user (without the raw key). */
  async listForUser(userId) {
    return ApiKeyModel.listForUser(userId);
  },

  /** Revoke a key (must belong to the requesting user or an admin). */
  async revoke(id, userId) {
    const ok = await ApiKeyModel.revoke(id, userId);
    if (!ok) {
      throw createError('API key not found or already revoked', 404, ERROR_CODES.NOT_FOUND_API_KEY);
    }
  },
};

module.exports = ApiKeyService;
