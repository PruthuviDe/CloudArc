/**
 * config/redis.js
 * ─────────────────────────────────────────────────────────
 * Creates and exports a Redis client (ioredis).
 * Used for response caching to reduce database load.
 */

const Redis = require('ioredis');
const config = require('./index');

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  maxRetriesPerRequest: 3,
  // Gracefully handle connection failures so the app can
  // still serve requests (without cache) when Redis is down.
  lazyConnect: true,
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

module.exports = redis;
