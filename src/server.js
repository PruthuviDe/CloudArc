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
  const server = app.listen(config.port, () => {
    logger.info('CloudArc API started', { port: config.port, env: config.env });
  });

  // Expose server for graceful shutdown
  process._httpServer = server;
}

// ── Graceful shutdown ────────────────────────────────────
async function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);

  // 1. Stop accepting new connections
  const server = process._httpServer;
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    logger.info('HTTP server closed — no new connections');
  }

  // 2. Close data connections
  try { await redis.quit();  } catch { /* already closed */ }
  try { await pool.end();    } catch { /* already closed */ }

  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
