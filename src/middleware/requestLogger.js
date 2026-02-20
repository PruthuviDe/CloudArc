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

// Include the Correlation ID (set by correlationId middleware) in every
// HTTP log line so you can grep a single UUID across all log output.
morgan.token('request-id', (req) => req.requestId || '-');

// Pipe Morgan output into Winston so all logs go through one pipeline
const stream = {
  write: (message) => logger.http(message.trimEnd()),
};

// Skip logging health-check noise in production
const skip = (req) =>
  process.env.NODE_ENV === 'production' && req.url === '/health';

// Dev: human-readable with ID prefix
// Prod: Apache combined with request ID appended
const devFmt  = ':request-id :method :url :status :response-time ms';
const prodFmt = ':request-id :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

const requestLogger = morgan(isDev ? devFmt : prodFmt, { stream, skip });

module.exports = requestLogger;
