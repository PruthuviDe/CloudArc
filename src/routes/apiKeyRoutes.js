/**
 * routes/apiKeyRoutes.js
 * ─────────────────────────────────────────────────────────
 * All routes require a valid access token (Bearer JWT).
 * Users manage their own keys; admins may list any user's keys.
 *
 *   GET    /api/v1/api-keys           → list own keys
 *   POST   /api/v1/api-keys           → create key (returns plaintext ONCE)
 *   DELETE /api/v1/api-keys/:id       → revoke key
 */

const { Router } = require('express');
const Joi = require('joi');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const ApiKeyService = require('../services/apiKeyService');

const router = Router();

// All routes require auth
router.use(authenticate);

const createSchema = Joi.object({
  name:          Joi.string().min(1).max(100).required(),
  expiresInDays: Joi.number().integer().min(1).max(3650).optional(),
});

/**
 * @swagger
 * /api/api-keys:
 *   get:
 *     summary: List your API keys
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of key metadata (no raw key)
 */
router.get('/', async (req, res, next) => {
  try {
    const keys = await ApiKeyService.listForUser(req.user.id);
    res.json({ success: true, data: keys });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/api-keys:
 *   post:
 *     summary: Create a new API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               expiresInDays:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Key created — `key` field shown only once
 */
router.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const result = await ApiKeyService.create({
      userId:       req.user.id,
      name:         req.body.name,
      expiresInDays: req.body.expiresInDays,
    });
    res.status(201).json({
      success: true,
      data: result,
      warning: 'Store this key securely — it will not be shown again.',
    });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/api-keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Key revoked
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await ApiKeyService.revoke(parseInt(req.params.id, 10), req.user.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
