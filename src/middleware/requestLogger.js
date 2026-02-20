/**
 * middleware/requestLogger.js
 * ─────────────────────────────────────────────────────────
 * Thin wrapper around morgan that can be extended later
 * (e.g., structured JSON logging with winston/pino).
 */

const morgan = require('morgan');

// 'dev' format is compact and colour-coded — perfect for local work.
// In production you'd swap this with 'combined' or a custom format.
const requestLogger = morgan('dev');

module.exports = requestLogger;
