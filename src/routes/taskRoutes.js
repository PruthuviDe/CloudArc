/**
 * routes/taskRoutes.js
 * ─────────────────────────────────────────────────────────
 * Maps HTTP verbs + paths to TaskController actions.
 */

const { Router } = require('express');
const TaskController = require('../controllers/taskController');

const router = Router();

router.get('/', TaskController.getAll);
router.get('/:id', TaskController.getById);
router.post('/', TaskController.create);
router.put('/:id', TaskController.update);
router.delete('/:id', TaskController.delete);

module.exports = router;
