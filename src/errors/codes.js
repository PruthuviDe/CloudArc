/**
 * errors/codes.js
 * ─────────────────────────────────────────────────────────
 * Machine-readable error codes for every expected error type.
 * Frontends key off `error.code` for i18n / specific handling.
 *
 * Format: DOMAIN_NNN
 */

const ERROR_CODES = {
  // ── Auth ───────────────────────────────────────────────
  AUTH_INVALID_CREDENTIALS:   'AUTH_001',
  AUTH_EMAIL_TAKEN:           'AUTH_002',
  AUTH_USERNAME_TAKEN:        'AUTH_003',
  AUTH_TOKEN_INVALID:         'AUTH_004',
  AUTH_TOKEN_REUSE:           'AUTH_005',
  AUTH_UNAUTHENTICATED:       'AUTH_006',
  AUTH_RESET_TOKEN_INVALID:   'AUTH_007',

  // ── Authorisation ──────────────────────────────────────
  FORBIDDEN:                  'FORBIDDEN_001',

  // ── Validation ────────────────────────────────────────
  VALIDATION_FAILED:          'VALIDATION_001',

  // ── Not found ─────────────────────────────────────────
  NOT_FOUND_USER:             'NOT_FOUND_001',
  NOT_FOUND_TASK:             'NOT_FOUND_002',
  NOT_FOUND_API_KEY:          'NOT_FOUND_003',
  NOT_FOUND_GENERIC:          'NOT_FOUND_004',

  // ── Rate limiting ─────────────────────────────────────
  RATE_LIMIT:                 'RATE_LIMIT_001',

  // ── API keys ──────────────────────────────────────────
  API_KEY_INVALID:            'API_KEY_001',
  API_KEY_EXPIRED:            'API_KEY_002',
  API_KEY_REVOKED:            'API_KEY_003',

  // ── Server ────────────────────────────────────────────
  SERVER_ERROR:               'SERVER_001',
};

/**
 * Create a standardised application error.
 * @param {string} message   Human-readable message
 * @param {number} status    HTTP status code
 * @param {string} code      One of ERROR_CODES values
 */
function createError(message, status, code) {
  const err = new Error(message);
  err.statusCode = status;
  err.code = code;
  return err;
}

module.exports = { ERROR_CODES, createError };
