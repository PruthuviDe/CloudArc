/**
 * tests/auth.test.js
 * ─────────────────────────────────────────────────────────
 * Tests POST /api/auth/register and POST /api/auth/login.
 * AuthModel is mocked — no real database needed.
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');

// Set env before app is required
process.env.JWT_SECRET = 'test-secret-for-jest';

// Mock the auth model so no real DB queries run
jest.mock('../src/models/authModel');
const AuthModel = require('../src/models/authModel');
const app = require('../src/app');

// Generate a real hash so bcrypt.compare passes in login tests
let VALID_USER;
beforeAll(async () => {
  const password_hash = await bcrypt.hash('Password1', 4); // low rounds = fast in tests
  VALID_USER = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password_hash,
    created_at: new Date().toISOString(),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Registration ─────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('creates a user and returns a JWT', async () => {
    AuthModel.findByEmail.mockResolvedValue(null);
    AuthModel.findByUsername.mockResolvedValue(null);
    AuthModel.create.mockResolvedValue({
      id: VALID_USER.id,
      username: VALID_USER.username,
      email: VALID_USER.email,
      created_at: VALID_USER.created_at,
    });

    const res = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password1',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  it('returns 422 when password is too weak', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'short',
    });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 when email is invalid', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'not-an-email',
      password: 'Password1',
    });
    expect(res.status).toBe(422);
  });

  it('returns 409 when email already exists', async () => {
    AuthModel.findByEmail.mockResolvedValue(VALID_USER);
    AuthModel.findByUsername.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/register').send({
      username: 'newuser',
      email: 'test@example.com',
      password: 'Password1',
    });
    expect(res.status).toBe(409);
  });

  it('returns 409 when username already exists', async () => {
    AuthModel.findByEmail.mockResolvedValue(null);
    AuthModel.findByUsername.mockResolvedValue({ id: 99 });

    const res = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'other@example.com',
      password: 'Password1',
    });
    expect(res.status).toBe(409);
  });
});

// ── Login ────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns a JWT on valid credentials', async () => {
    AuthModel.findByEmail.mockResolvedValue(VALID_USER);

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'Password1',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  it('returns 401 for wrong password', async () => {
    AuthModel.findByEmail.mockResolvedValue(VALID_USER);

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'WrongPass99',
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    AuthModel.findByEmail.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({
      email: 'ghost@example.com',
      password: 'Password1',
    });
    expect(res.status).toBe(401);
  });

  it('returns 422 when body is missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
    });
    expect(res.status).toBe(422);
  });
});
