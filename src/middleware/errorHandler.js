/**
 * middleware/errorHandler.js
 * ─────────────────────────────────────────────────────────
 * Centralised Express error-handling middleware.
 * Every `next(err)` call in the app funnels through here,
 * ensuring a consistent JSON error envelope.
 */

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log full stack in development for easy debugging
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Error] ${statusCode} — ${message}`);
    if (statusCode === 500) console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}

module.exports = errorHandler;
