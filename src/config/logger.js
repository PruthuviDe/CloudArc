/**
 * config/logger.js
 * ─────────────────────────────────────────────────────────
 * Winston logger — single instance shared across the app.
 *
 * Outputs:
 *   Development  → colourized human-readable text to console
 *   Production   → JSON to console + rotating daily log files
 *                    logs/combined-%DATE%.log  (all levels)
 *                    logs/error-%DATE%.log     (error only)
 *
 * Log files are kept for 14 days, max 20 MB each.
 * The logs/ directory is git-ignored.
 */

const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');

const { combine, timestamp, errors, json, colorize, printf } = format;

const isDev = process.env.NODE_ENV !== 'production';

// ── Development format ───────────────────────────────────
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${level}] ${stack || message}${extras}`;
  })
);

// ── Production format (JSON, machine-readable) ───────────
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// ── Rotating file transports (production only) ───────────
const fileTransports = isDev
  ? []
  : [
      new transports.DailyRotateFile({
        filename:     'logs/error-%DATE%.log',
        datePattern:  'YYYY-MM-DD',
        level:        'error',
        maxFiles:     '14d',
        maxSize:      '20m',
        zippedArchive: true,
      }),
      new transports.DailyRotateFile({
        filename:     'logs/combined-%DATE%.log',
        datePattern:  'YYYY-MM-DD',
        maxFiles:     '14d',
        maxSize:      '20m',
        zippedArchive: true,
      }),
    ];

const logger = createLogger({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  format: isDev ? devFormat : prodFormat,
  transports: [
    new transports.Console(),
    ...fileTransports,
  ],
  // Prevent Winston from crashing the process on unhandled exceptions
  exitOnError: false,
});

module.exports = logger;
