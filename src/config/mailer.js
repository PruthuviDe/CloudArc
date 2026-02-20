/**
 * config/mailer.js
 * ─────────────────────────────────────────────────────────
 * Nodemailer transporter.
 * Set EMAIL_HOST / EMAIL_USER / EMAIL_PASS in .env.
 * Defaults to Ethereal (fake SMTP) when no credentials are provided
 * so the app stays functional in development without a real mailbox.
 *
 * For production, configure an SMTP provider (SendGrid, Mailgun, etc.)
 * via the EMAIL_* environment variables.
 */

const nodemailer = require('nodemailer');
const config = require('./index');
const logger = require('./logger');

let transporter;

async function getTransporter() {
  if (transporter) return transporter;

  if (config.email.host) {
    // Real SMTP provider configured
    transporter = nodemailer.createTransport({
      host:   config.email.host,
      port:   config.email.port,
      secure: config.email.secure,
      auth:   config.email.user
        ? { user: config.email.user, pass: config.email.pass }
        : undefined,
    });
    logger.info('Mailer using configured SMTP', { host: config.email.host });
  } else {
    // Fall back to Ethereal (dev/test only) — no real emails sent
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host:   'smtp.ethereal.email',
      port:   587,
      secure: false,
      auth:   { user: testAccount.user, pass: testAccount.pass },
    });
    logger.info('Mailer using Ethereal test account', {
      preview: 'https://ethereal.email/messages',
      user: testAccount.user,
    });
  }

  return transporter;
}

/**
 * Send an email. Returns the Nodemailer info object.
 * Logs the Ethereal preview URL in dev.
 */
async function sendMail({ to, subject, html, text }) {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: config.email.from || '"CloudArc" <no-reply@cloudsarc.site>',
    to,
    subject,
    html,
    text,
  });

  // Log preview URL when using Ethereal
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info('Email preview (Ethereal)', { url: previewUrl });
  }

  return info;
}

module.exports = { sendMail };
