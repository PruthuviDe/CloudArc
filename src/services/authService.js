/**
 * services/authService.js
 * ─────────────────────────────────────────────────────────
 * Business logic for registration and login.
 * Password hashing lives here (never in the model/controller).
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AuthModel = require('../models/authModel');
const config = require('../config');

const SALT_ROUNDS = 12;

const AuthService = {
  /**
   * Register a new user.
   * Throws 409 if email or username already exists.
   */
  async register({ username, email, password }) {
    const [existingEmail, existingUsername] = await Promise.all([
      AuthModel.findByEmail(email),
      AuthModel.findByUsername(username),
    ]);

    if (existingEmail) {
      const err = new Error('Email is already registered');
      err.statusCode = 409;
      throw err;
    }
    if (existingUsername) {
      const err = new Error('Username is already taken');
      err.statusCode = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await AuthModel.create({ username, email, passwordHash });

    const token = AuthService._signToken(user);
    return { user, token };
  },

  /**
   * Login with email + password.
   * Throws 401 on invalid credentials (generic message to prevent enumeration).
   */
  async login({ email, password }) {
    const user = await AuthModel.findByEmail(email);

    // Compare even if user not found to prevent timing attacks
    const hash = user ? user.password_hash : '$2a$12$invalidhashpadding000000000000000000000000000000000000000';
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const { password_hash: _, ...safeUser } = user; // strip hash
    const token = AuthService._signToken(safeUser);
    return { user: safeUser, token };
  },

  /** Signs a JWT with user identity claims. */
  _signToken(user) {
    return jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  },
};

module.exports = AuthService;
