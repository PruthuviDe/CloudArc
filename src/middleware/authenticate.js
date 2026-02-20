/**
 * middleware/authenticate.js
 * ─────────────────────────────────────────────────────────
 * Verifies the JWT from the Authorization header.
 * Attaches the decoded payload to req.user on success.
 *
 * Usage:
 *   router.get('/protected', authenticate, handler)
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { message: 'Missing or malformed Authorization header' },
    });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = payload; // { id, username, email, iat, exp }
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token';
    return res.status(401).json({ success: false, error: { message } });
  }
}

module.exports = authenticate;
