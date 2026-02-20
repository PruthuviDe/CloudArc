/**
 * middleware/notFound.js
 * ─────────────────────────────────────────────────────────
 * Catches any request that didn't match a route and returns
 * a 404 JSON response instead of Express's default HTML page.
 */

function notFound(req, res, _next) {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

module.exports = notFound;
