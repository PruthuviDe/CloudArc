/**
 * middleware/requestLogger.js
 * ─────────────────────────────────────────────────────────
 * Morgan HTTP request logger piped into Winston.
 *
 * Development  → compact colourised 'dev' output via Winston
 * Production   → 'combined' Apache-style, written as JSON fields
 *                so log aggregators (Datadog, Loki, etc.) can parse them
 */

const morgan = require('morgan');
const logger = require('../config/logger');

const isDev = process.env.NODE_ENV !== 'production';

// Pipe Morgan output into Winston so all logs go through one pipeline
const stream = {
  write: (message) => logger.http(message.trimEnd()),
};

// Skip logging health-check noise in production
const skip = (req) =>
  process.env.NODE_ENV === 'production' && req.url === '/health';

const requestLogger = morgan(isDev ? 'dev' : 'combined', { stream, skip });

module.exports = requestLogger;
