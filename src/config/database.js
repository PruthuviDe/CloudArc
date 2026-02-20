/**
 * config/database.js
 * ─────────────────────────────────────────────────────────
 * Creates and exports a PostgreSQL connection pool.
 * All database access flows through this single pool so
 * connections are reused efficiently.
 */

const { Pool } = require('pg');
const config = require('./index');

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 20,               // max connections in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log pool-level errors so they don't crash the process silently
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

module.exports = pool;
