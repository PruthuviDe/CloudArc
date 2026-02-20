/**
 * instrument.js
 * ─────────────────────────────────────────────────────────
 * Sentry MUST be initialised before any other imports so it
 * can patch Express, pg, ioredis, etc. with auto-instrumentation.
 *
 * This file is required at the very top of app.js.
 * When SENTRY_DSN is not set the file is a no-op.
 */

const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.2,
    sendDefaultPii: true, // includes IP, user agent, etc.
  });
}

module.exports = Sentry;
