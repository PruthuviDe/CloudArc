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

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: List all tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       401:
 *         description: Missing or invalid JWT
 */
router.get('/',     TaskController.getAll);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a single task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Task not found
 */
router.get('/:id',  TaskController.getById);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskInput'
 *     responses:
 *       201:
 *         description: Created task object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       401:
 *         description: Missing or invalid JWT
 *       422:
 *         description: Validation error
 */
router.post('/',    validate(createTaskSchema), TaskController.create);

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTaskInput'
 *     responses:
 *       200:
 *         description: Updated task object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Task not found
 *       422:
 *         description: Validation error
 */
router.put('/:id',  validate(updateTaskSchema), TaskController.update);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deletion confirmed
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Task not found
 */
router.delete('/:id', TaskController.delete);

module.exports = router;
