/**
 * middleware/correlationId.js
 * ─────────────────────────────────────────────────────────
 * Assigns a unique ID to every incoming HTTP request.
 *
 * How it works
 * ────────────
 * 1. Reads X-Request-Id from the client (Cloudflare / load balancer / curl)
 * 2. Falls back to generating a fresh UUID v4 if none is provided
 * 3. Attaches the ID to req.requestId (available to all downstream middleware)
 * 4. Echoes the ID back in X-Request-Id response header
 *
 * Why this matters
 * ────────────────
 * When something breaks you can grep a single UUID across ALL log lines
 * and see the entire lifecycle of that request — auth, DB query, Redis
 * cache, response status — in one shot.
 *
 * Usage in controllers / services:
 *   logger.info('cache miss', { requestId: req.requestId });
 */

const { v4: uuidv4 } = require('uuid');

module.exports = function correlationId(req, res, next) {
  const id = req.headers['x-request-id'] || uuidv4();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);   // client can correlate response → request
  next();
};
