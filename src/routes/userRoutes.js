/**
 * routes/userRoutes.js
 * ─────────────────────────────────────────────────────────
 * Maps HTTP verbs + paths to UserController actions.
 */

const { Router } = require('express');
const UserController = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validators/userSchemas');

const router = Router();

// All user routes require a valid JWT
router.use(authenticate);

router.get('/',     UserController.getAll);
router.get('/:id',  UserController.getById);
router.post('/',    validate(createUserSchema), UserController.create);
router.put('/:id',  validate(updateUserSchema), UserController.update);
router.delete('/:id', UserController.delete);

module.exports = router;
