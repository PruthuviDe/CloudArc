/**
 * app.js
 * ─────────────────────────────────────────────────────────
 * Configures the Express application:
 *   • Global middleware (security, logging, body parsing)
 *   • API routes
 *   • 404 & error-handling middleware
 *
 * The app is exported without calling .listen() so that
 * tests can import it without starting a real server.
 */

// ── Sentry MUST be first — before express and all other imports ──
const Sentry = require('./instrument');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const logger = require('./config/logger');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');

const app = express();

// ── Sentry (initialise before any routes) ────────────────
// Enabled only when SENTRY_DSN is set — safe no-op otherwise.
if (process.env.SENTRY_DSN) {
  logger.info('Sentry error tracking enabled');
}

// ── Global middleware ────────────────────────────────────
// contentSecurityPolicy disabled — Swagger UI needs inline scripts.
// All other helmet headers (X-Frame-Options, HSTS, etc.) remain active.
app.use(helmet({ contentSecurityPolicy: false }));  // Security headers
app.use(cors());              // Cross-origin support
app.use(express.json());      // Parse JSON bodies
app.use(requestLogger);       // HTTP request logging

// ── Swagger API Docs ────────────────────────────────────
// Browsable at /api/docs  — skipped in test environment.
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'CloudArc API Docs',
  }));
}

// ── Health check (useful for load balancers / k8s probes) ─
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.1.0',          // Tier 3: migrations + swagger + staging
  });
});

// ── API routes ───────────────────────────────────────────
app.use('/api', apiRoutes);
// ── Sentry error handler (must be before custom error handler) ─
// Captures all unhandled exceptions and sends to Sentry dashboard.
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}
// ── Catch-all & error handling ───────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
