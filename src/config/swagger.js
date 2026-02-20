/**
 * config/swagger.js
 * ─────────────────────────────────────────────────────────
 * Generates the OpenAPI 3.0 spec from JSDoc @swagger
 * annotations in the route files.
 *
 * Browsable at  GET /api/docs
 * Raw JSON at   GET /api/docs.json   (appended by swagger-ui-express)
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CloudArc API',
      version: '1.0.0',
      description:
        'Production-grade REST API built with Node.js, Express, PostgreSQL and Redis. ' +
        'All protected endpoints require a Bearer JWT obtained from `/api/auth/login`.',
      contact: {
        name: 'CloudArc',
        url: 'https://cloudsarc.site',
      },
    },
    servers: [
      { url: 'https://cloudsarc.site', description: 'Production' },
      { url: 'http://localhost:3000',  description: 'Local development' },
    ],
    tags: [
      { name: 'Health',  description: 'Service health-check' },
      { name: 'Auth',    description: 'Register and log in' },
      { name: 'Users',   description: 'User resource (JWT required)' },
      { name: 'Tasks',   description: 'Task resource (JWT required)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
          description:  'Paste the token from /api/auth/login here.',
        },
      },
      schemas: {
        // ── Shared ──────────────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            error:   { type: 'string', example: 'Not found' },
            message: { type: 'string', example: 'Route /api/foo does not exist' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            error:   { type: 'string', example: 'Validation error' },
            details: {
              type: 'array',
              items: { type: 'string' },
              example: ['"username" is required', '"password" must be at least 8 characters'],
            },
          },
        },
        // ── Auth ────────────────────────────────────────────
        AuthToken: {
          type: 'object',
          properties: {
            token: {
              type:    'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            user: {
              type: 'object',
              properties: {
                id:       { type: 'integer', example: 1 },
                username: { type: 'string',  example: 'johndoe' },
                email:    { type: 'string',  example: 'john@example.com' },
              },
            },
          },
        },
        RegisterInput: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', example: 'johndoe',          description: '3–30 alphanumeric chars' },
            email:    { type: 'string', example: 'john@example.com', format: 'email' },
            password: { type: 'string', example: 'Secret123',        description: 'Min 8 chars, 1 uppercase, 1 number' },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email:    { type: 'string', example: 'john@example.com', format: 'email' },
            password: { type: 'string', example: 'Secret123' },
          },
        },
        // ── User ────────────────────────────────────────────
        User: {
          type: 'object',
          properties: {
            id:         { type: 'integer', example: 1 },
            username:   { type: 'string',  example: 'johndoe' },
            email:      { type: 'string',  example: 'john@example.com' },
            created_at: { type: 'string',  format: 'date-time' },
            updated_at: { type: 'string',  format: 'date-time' },
          },
        },
        CreateUserInput: {
          type: 'object',
          required: ['username', 'email'],
          properties: {
            username: { type: 'string', example: 'janedoe' },
            email:    { type: 'string', example: 'jane@example.com', format: 'email' },
          },
        },
        UpdateUserInput: {
          type: 'object',
          description: 'At least one field required',
          properties: {
            username: { type: 'string', example: 'janedoe_updated' },
            email:    { type: 'string', example: 'jane_new@example.com', format: 'email' },
          },
        },
        // ── Task ────────────────────────────────────────────
        Task: {
          type: 'object',
          properties: {
            id:          { type: 'integer', example: 1 },
            title:       { type: 'string',  example: 'Write deployment docs' },
            description: { type: 'string',  example: 'Document the CI/CD pipeline' },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed'],
              example: 'pending',
            },
            user_id:    { type: 'integer', example: 1 },
            created_at: { type: 'string',  format: 'date-time' },
            updated_at: { type: 'string',  format: 'date-time' },
          },
        },
        CreateTaskInput: {
          type: 'object',
          required: ['title', 'user_id'],
          properties: {
            title:       { type: 'string', example: 'Deploy to staging' },
            description: { type: 'string', example: 'Run docker compose up on staging server' },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed'],
              default: 'pending',
            },
            user_id: { type: 'integer', example: 1 },
          },
        },
        UpdateTaskInput: {
          type: 'object',
          description: 'At least one field required',
          properties: {
            title:       { type: 'string', example: 'Updated task title' },
            description: { type: 'string', example: 'Updated description' },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed'],
            },
            user_id: { type: 'integer', example: 1 },
          },
        },
      },
    },
  },
  // Scan all route files for @swagger JSDoc comments
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
