/**
 * database/seed.js
 * ─────────────────────────────────────────────────────────
 * Inserts sample data for local development and testing.
 *
 * Usage:  npm run seed
 */

require('dotenv').config();
const pool = require('../config/database');

const seedSQL = `
-- Clear existing data (development only!)
TRUNCATE tasks, users RESTART IDENTITY CASCADE;

-- ── Sample users ─────────────────────────────────────────
INSERT INTO users (username, email) VALUES
  ('alice',   'alice@example.com'),
  ('bob',     'bob@example.com'),
  ('charlie', 'charlie@example.com');

-- ── Sample tasks ─────────────────────────────────────────
INSERT INTO tasks (title, description, status, user_id) VALUES
  ('Set up CI/CD pipeline',     'Configure GitHub Actions for automated builds',    'pending',      1),
  ('Write unit tests',          'Cover user and task services with tests',           'in_progress',  1),
  ('Design database schema',    'Normalize tables and add indexes',                 'completed',    2),
  ('Implement Redis caching',   'Cache GET /tasks endpoint',                        'in_progress',  2),
  ('Create API documentation',  'Swagger / OpenAPI spec',                           'pending',      3),
  ('Dockerize the application', 'Write Dockerfile and docker-compose.yml',          'pending',      3);
`;

async function seed() {
  console.log('[Seed] Inserting sample data…');
  try {
    await pool.query(seedSQL);
    console.log('[Seed] ✔  Seed data inserted');
  } catch (err) {
    console.error('[Seed] ✖  Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
