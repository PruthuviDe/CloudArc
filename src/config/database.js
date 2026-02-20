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
  min: 2,                              // keep at least 2 warm connections
  max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS, 10) || 10000,
});

// Log pool-level errors so they don't crash the process silently
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

module.exports = pool;
