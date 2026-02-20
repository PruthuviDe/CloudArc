/**
 * middleware/rateLimiter.js
 * ─────────────────────────────────────────────────────────
 * Redis-backed fixed-window rate limiter factory.
 *
 * Usage:
 *   const { authLimiter, apiLimiter } = require('./rateLimiter');
 *   router.post('/login', authLimiter, ...);
 *   router.use(apiLimiter);
 *
 * Profiles:
 *   auth    → 10 requests / 15 min  per IP   (login, register, forgot-password)
 *   api     → 100 requests / 1 min  per user (or IP if unauthenticated)
 *
 * Redis key: rl:{profile}:{identifier}
 * Falls through silently if Redis is unavailable (fail-open).
 */

const redis = require('../config/redis');
const logger = require('../config/logger');

/**
 * Create a rate-limiter middleware.
 * @param {object} opts
 * @param {string}  opts.name        Profile name (used in key + error message)
 * @param {number}  opts.max         Request limit per window
 * @param {number}  opts.windowSecs  Window duration in seconds
 * @param {boolean} opts.byUser      If true, key by user id when authenticated
 */
function createLimiter({ name, max, windowSecs, byUser = false }) {
  return async function rateLimiter(req, res, next) {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') return next();

    try {
      // Determine the identifier for this request
      const id = byUser && req.user
        ? `user:${req.user.id}`
        : `ip:${req.ip}`;

      const key = `rl:${name}:${id}`;

      // Increment counter; INCR is atomic
      const count = await redis.incr(key);

      // Set TTL only on the very first increment (avoids resetting the window)
      if (count === 1) {
        await redis.expire(key, windowSecs);
      }

      // Expose headers so clients can see their quota
      const ttl = await redis.ttl(key);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + ttl);

      if (count > max) {
        return res.status(429).json({
          success: false,
          error:   `Too many requests — ${name} limit is ${max} per ${windowSecs}s. Retry after ${ttl}s.`,
        });
      }

      next();
    } catch (err) {
      // Redis failure — fail open (don't block the request)
      logger.warn('Rate limiter Redis error — skipping', { error: err.message });
      next();
    }
  };
}

/** Strict limiter for auth endpoints (10 req / 15 min per IP) */
const authLimiter = createLimiter({
  name:        'auth',
  max:         10,
  windowSecs:  15 * 60, // 15 minutes
  byUser:      false,   // keyed by IP — user may not be authenticated yet
});

/** Standard API limiter (100 req / 60 s per user, or IP if unauthed) */
const apiLimiter = createLimiter({
  name:       'api',
  max:        100,
  windowSecs: 60,
  byUser:     true,
});

module.exports = { authLimiter, apiLimiter, createLimiter };
