/**
 * routes/userRoutes.js
 * ─────────────────────────────────────────────────────────
 * Maps HTTP verbs + paths to UserController actions.
 */

const { Router } = require('express');
const UserController = require('../controllers/userController');

const router = Router();

router.get('/', UserController.getAll);
router.get('/:id', UserController.getById);
router.post('/', UserController.create);
router.put('/:id', UserController.update);
router.delete('/:id', UserController.delete);

module.exports = router;
