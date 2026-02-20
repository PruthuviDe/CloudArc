/**
 * tests/users.test.js
 * ─────────────────────────────────────────────────────────
 * Tests for /api/users endpoints.
 * UserService is mocked. Requests use a real JWT signed with
 * the test secret so the authenticate middleware passes.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-for-jest';

jest.mock('../src/services/userService');
const UserService = require('../src/services/userService');
const app = require('../src/app');

// Sign a token that the authenticate middleware will accept
const AUTH_TOKEN = jwt.sign(
  { id: 1, username: 'testuser', email: 'test@example.com' },
  'test-secret-for-jest',
  { expiresIn: '1h' }
);
const AUTH_HEADER = `Bearer ${AUTH_TOKEN}`;

const FAKE_USER = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
};

beforeEach(() => jest.clearAllMocks());

// ── Authentication guard ──────────────────────────────────

describe('Auth guard on /api/users', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/users ────────────────────────────────────────

describe('GET /api/users', () => {
  it('returns user list', async () => {
    UserService.getAllUsers.mockResolvedValue({ rows: [FAKE_USER], total: 1 });

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── GET /api/users/:id ────────────────────────────────────

describe('GET /api/users/:id', () => {
  it('returns a single user', async () => {
    UserService.getUserById.mockResolvedValue(FAKE_USER);

    const res = await request(app)
      .get('/api/users/1')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(1);
  });

  it('returns 404 when user not found', async () => {
    const err = new Error('User not found');
    err.statusCode = 404;
    UserService.getUserById.mockRejectedValue(err);

    const res = await request(app)
      .get('/api/users/999')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(404);
  });
});

// ── POST /api/users ───────────────────────────────────────

describe('POST /api/users', () => {
  it('creates a user and returns 201', async () => {
    UserService.createUser.mockResolvedValue(FAKE_USER);

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', AUTH_HEADER)
      .send({ username: 'testuser', email: 'test@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.data.username).toBe('testuser');
  });

  it('returns 422 when email is missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', AUTH_HEADER)
      .send({ username: 'testuser' });

    expect(res.status).toBe(422);
  });
});

// ── PUT /api/users/:id ────────────────────────────────────

describe('PUT /api/users/:id', () => {
  it('updates a user', async () => {
    UserService.updateUser.mockResolvedValue({ ...FAKE_USER, username: 'updated' });

    const res = await request(app)
      .put('/api/users/1')
      .set('Authorization', AUTH_HEADER)
      .send({ username: 'updated' });

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('updated');
  });

  it('returns 422 when body is empty', async () => {
    const res = await request(app)
      .put('/api/users/1')
      .set('Authorization', AUTH_HEADER)
      .send({});

    expect(res.status).toBe(422);
  });
});
