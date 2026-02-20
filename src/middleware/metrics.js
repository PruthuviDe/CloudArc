/**
 * middleware/metrics.js
 * ─────────────────────────────────────────────────────────
 * Prometheus metrics for the CloudArc API.
 *
 * Exposes:
 *   GET /metrics  → Prometheus text format (scraped every 15s)
 *
 * Metrics collected
 * ─────────────────
 *   http_requests_total          Counter   — requests by method/route/status
 *   http_request_duration_seconds Histogram — latency by method/route/status
 *   + all default Node.js metrics (heap, CPU, event loop lag, GC, etc.)
 *
 * Architecture
 * ────────────
 * /metrics is NOT proxied through Nginx (not in nginx.conf).
 * Prometheus reaches api:3000/metrics directly over the Docker network.
 * This keeps the endpoint invisible to the public internet.
 */

const client = require('prom-client');

// ── Default Node.js metrics (memory, CPU, event loop, GC) ─
client.collectDefaultMetrics({
  labels: { app: 'cloudarc-api' },
});

// ── HTTP request counter ──────────────────────────────────
const httpRequestsTotal = new client.Counter({
  name:    'http_requests_total',
  help:    'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// ── HTTP request duration histogram ─────────────────────
// Buckets chosen to spread nicely across typical API latency ranges.
const httpRequestDuration = new client.Histogram({
  name:    'http_request_duration_seconds',
  help:    'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// ── metricsMiddleware ─────────────────────────────────────
// Placed BEFORE routes so the timer starts at the very beginning
// of request processing.
function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    // Normalise dynamic path params: /api/users/42 → /api/users/:id
    // Uses Express's matched route pattern when available.
    const route = req.route
      ? `${req.baseUrl || ''}${req.route.path}`
      : req.path;

    const labels = {
      method:      req.method,
      route,
      status_code: res.statusCode,
    };

    httpRequestsTotal.inc(labels);
    end(labels);
  });

  next();
}

// ── /metrics handler ─────────────────────────────────────
async function metricsHandler(_req, res) {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}

module.exports = { metricsMiddleware, metricsHandler };
