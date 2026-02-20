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

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');

const app = express();

// ── Global middleware ────────────────────────────────────
app.use(helmet());            // Security headers
app.use(cors());              // Cross-origin support
app.use(express.json());      // Parse JSON bodies
app.use(requestLogger);       // HTTP request logging

// ── Health check (useful for load balancers / k8s probes) ─
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API routes ───────────────────────────────────────────
app.use('/api', apiRoutes);

// ── Catch-all & error handling ───────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
