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
const redis = require('./config/redis');
const pool = require('./config/database');

async function start() {
  // ── Verify PostgreSQL connectivity ─────────────────────
  try {
    await pool.query('SELECT 1');
    console.log(`[DB] PostgreSQL connected  (${config.db.host}:${config.db.port}/${config.db.database})`);
  } catch (err) {
    console.error('[DB] PostgreSQL connection failed:', err.message);
    console.error('     Make sure PostgreSQL is running and .env values are correct.');
    process.exit(1);
  }

  // ── Connect Redis (non-blocking — app works without it) ─
  try {
    await redis.connect();
  } catch {
    console.warn('[Redis] Could not connect — caching disabled');
  }

  // ── Start HTTP server ──────────────────────────────────
  app.listen(config.port, () => {
    console.log(`[Server] CloudArc API listening on http://localhost:${config.port}`);
    console.log(`[Server] Environment: ${config.env}`);
  });
}

// ── Graceful shutdown ────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n[Server] ${signal} received — shutting down…`);
  try { await redis.quit(); } catch { /* already closed */ }
  try { await pool.end(); } catch { /* already closed */ }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
