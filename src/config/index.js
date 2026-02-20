/**
 * config/index.js
 * ─────────────────────────────────────────────────────────
 * Central configuration module.
 * Reads all environment variables once and exports a frozen
 * config object consumed by the rest of the application.
 */

require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  db: {
    host: process.env.DB_HOST || 'db',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'cloudarc',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  cacheTTL: parseInt(process.env.CACHE_TTL, 10) || 60, // seconds

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};

module.exports = Object.freeze(config);
