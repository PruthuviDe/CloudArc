/**
 * routes/taskRoutes.js
 * ─────────────────────────────────────────────────────────
 * Maps HTTP verbs + paths to TaskController actions.
 */

const { Router } = require('express');
const TaskController = require('../controllers/taskController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema } = require('../validators/taskSchemas');

const router = Router();

// All task routes require a valid JWT
router.use(authenticate);

router.get('/',     TaskController.getAll);
router.get('/:id',  TaskController.getById);
router.post('/',    validate(createTaskSchema), TaskController.create);
router.put('/:id',  validate(updateTaskSchema), TaskController.update);
router.delete('/:id', TaskController.delete);

module.exports = router;
