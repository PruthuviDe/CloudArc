/**
 * middleware/errorHandler.js
 * ─────────────────────────────────────────────────────────
 * Centralised Express error-handling middleware.
 * Every `next(err)` call in the app funnels through here,
 * ensuring a consistent JSON error envelope.
 */

const logger = require('../config/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // 5xx = unexpected — log as error with full stack
  // 4xx = client mistake — log as warn (not actionable)
  if (statusCode >= 500) {
    logger.error(message, {
      statusCode,
      method: req.method,
      url: req.originalUrl,
      stack: err.stack,
    });
  } else {
    logger.warn(message, { statusCode, method: req.method, url: req.originalUrl });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      // Only expose stack trace outside production
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}

module.exports = errorHandler;
