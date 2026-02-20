/**
 * server.js
 * ─────────────────────────────────────────────────────────
 * Application entry point.
 * Boots the Express server and connects to Redis.
 *
 * Start:  npm start        (production)
 *         npm run dev      (nodemon hot-reload)
 */

const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const redis = require('./config/redis');
const pool = require('./config/database');

async function start() {
  // ── Verify PostgreSQL connectivity ─────────────────────
  try {
    await pool.query('SELECT 1');
    logger.info('PostgreSQL connected', { host: config.db.host, port: config.db.port, db: config.db.database });
  } catch (err) {
    logger.error('PostgreSQL connection failed — exiting', { error: err.message });
    process.exit(1);
  }

  // ── Connect Redis (non-blocking — app works without it) ─
  try {
    await redis.connect();
  } catch {
    logger.warn('Redis could not connect — caching disabled');
  }

  // ── Start HTTP server ──────────────────────────────────
  app.listen(config.port, () => {
    logger.info('CloudArc API started', { port: config.port, env: config.env });
  });
}

// ── Graceful shutdown ────────────────────────────────────
async function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);
  try { await redis.quit(); } catch { /* already closed */ }
  try { await pool.end(); } catch { /* already closed */ }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
