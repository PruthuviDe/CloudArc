/**
 * middleware/apiKeyAuth.js
 * ─────────────────────────────────────────────────────────
 * Machine-to-machine authentication via X-API-Key header.
 *
 * Key format: cloudarc_<64 hex chars>
 * First 8 chars after prefix are stored as key_prefix for DB lookup.
 * Full key is bcrypt-compared against the stored hash.
 *
 * This middleware sets req.user (same shape as JWT authenticate)
 * so downstream handlers work identically with either auth method.
 *
 * Usage:
 *   router.get('/webhook', apiKeyAuth, handler);
 *
 * Can be combined with authenticate using an "either-or" wrapper
 * if a route should accept both JWT and API keys.
 */

const bcrypt = require('bcryptjs');
const ApiKeyModel = require('../models/apiKeyModel');
const AuthModel = require('../models/authModel');
const { ERROR_CODES, createError } = require('../errors/codes');

async function apiKeyAuth(req, res, next) {
  const raw = req.headers['x-api-key'];

  if (!raw) {
    return next(createError('API key required — provide X-API-Key header', 401, ERROR_CODES.API_KEY_INVALID));
  }

  // Validate format: cloudarc_<hex64>
  const match = raw.match(/^cloudarc_([0-9a-f]{64})$/);
  if (!match) {
    return next(createError('Invalid API key format', 401, ERROR_CODES.API_KEY_INVALID));
  }

  const secret = match[1];
  const prefix = secret.slice(0, 8);

  // Find candidate rows (by cheap prefix index)
  const candidates = await ApiKeyModel.findByPrefix(prefix).catch(() => []);
  if (!candidates.length) {
    return next(createError('Invalid API key', 401, ERROR_CODES.API_KEY_INVALID));
  }

  // bcrypt-compare against each candidate (usually just one)
  let matched = null;
  for (const candidate of candidates) {
    // Check expiry before expensive bcrypt compare
    if (candidate.expires_at && new Date(candidate.expires_at) < new Date()) {
      continue; // expired
    }
    const ok = await bcrypt.compare(secret, candidate.key_hash);
    if (ok) { matched = candidate; break; }
  }

  if (!matched) {
    return next(createError('Invalid API key', 401, ERROR_CODES.API_KEY_INVALID));
  }

  // Hydrate req.user (same interface as JWT authenticate)
  const user = await AuthModel.findById(matched.user_id).catch(() => null);
  if (!user) {
    return next(createError('Invalid API key', 401, ERROR_CODES.API_KEY_INVALID));
  }

  const { password_hash: _, ...safeUser } = user;
  req.user = safeUser;
  req.apiKeyId = matched.id;

  // Update last_used_at asynchronously — don't block the request
  ApiKeyModel.touch(matched.id).catch(() => {});

  next();
}

module.exports = apiKeyAuth;
