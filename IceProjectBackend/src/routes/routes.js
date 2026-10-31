const express = require("express");
const router = express.Router();
const routeController = require("../controllers/routeController");
const { requireRole } = require("../middleware/rbac");
const { authenticate } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

/**
 * @swagger
 * /routes:
 *   get:
 *     summary: Get all routes
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by route date
 *       - in: query
 *         name: driverId
 *         schema:
 *           type: string
 *         description: Filter by driver
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planned, in-progress, completed, cancelled]
 *         description: Filter by route status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of routes per page
 *     responses:
 *       200:
 *         description: Routes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 routes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Route'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get("/", authenticate, routeController.getRoutes);

router.get("/routeByDriver/:driverId", authenticate, routeController.findRoutesByDriver);

/**
 * @swagger
 * /routes/{id}:
 *   get:
 *     summary: Get a specific route by ID
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Route'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Route not found
 */
router.get("/:id", authenticate, routeController.getRouteById);

/**
 * @swagger
 * /routes:
 *   post:
 *     summary: Create a new route
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - driverId
 *               - stops
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Route date (YYYY-MM-DD)
 *               driverId:
 *                 type: string
 *                 description: Driver assigned to the route
 *               stops:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     customerId:
 *                       type: string
 *                       description: Customer ID for the stop
 *                     sequence:
 *                       type: integer
 *                       description: Stop sequence number
 *                     estimatedDuration:
 *                       type: integer
 *                       description: Estimated duration in minutes
 *                     specialInstructions:
 *                       type: string
 *                       description: Special instructions for this stop
 *               warehouseId:
 *                 type: string
 *                 description: Starting warehouse
 *               truckId:
 *                 type: string
 *                 description: Truck assigned to the route
 *               notes:
 *                 type: string
 *                 description: General route notes
 *     responses:
 *       201:
 *         description: Route created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Route'
 *       400:
 *         description: Bad request - Invalid route data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 */
router.post(
  "/",
  authenticate,
  requireRole(["Admin", "SalesRep"]),
  routeController.createRoute
);

/**
 * @swagger
 * /routes/{id}:
 *   put:
 *     summary: Update a route
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Route ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               driverId:
 *                 type: string
 *               stops:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     customerId:
 *                       type: string
 *                     sequence:
 *                       type: integer
 *                     estimatedDuration:
 *                       type: integer
 *                     specialInstructions:
 *                       type: string
 *               status:
 *                 type: string
 *                 enum: [planned, in-progress, completed, cancelled]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Route updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Route'
 *       400:
 *         description: Bad request - Invalid route data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 *       404:
 *         description: Route not found
 */
router.put(
  "/:id",
  authenticate,
  requireRole(["Admin", "SalesRep", "Driver"]),
  routeController.updateRoute
);

/**
 * @swagger
 * /routes/{id}:
 *   delete:
 *     summary: Delete a route
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 *       404:
 *         description: Route not found
 */
router.delete(
  "/:id",
  authenticate,
  requireRole(["Admin", "SalesRep"]),
  routeController.deleteRoute
);

/**
 * @swagger
 * /routes/import/csv:
 *   post:
 *     summary: Import routes from CSV file
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file with route data
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Route date for imported routes
 *               driverId:
 *                 type: string
 *                 description: Default driver for imported routes
 *     responses:
 *       200:
 *         description: Routes imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 imported:
 *                   type: number
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       row:
 *                         type: integer
 *                       error:
 *                         type: string
 *       400:
 *         description: Bad request - Invalid CSV data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 */
router.post(
  "/import/csv",
  authenticate,
  requireRole(["Admin", "SalesRep"]),
  upload.single("file"),
  routeController.importRoutesFromCSV
);

/**
 * @swagger
 * /routes/{id}/assign-driver:
 *   post:
 *     summary: Assign a driver to a route
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Route ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driverId
 *             properties:
 *               driverId:
 *                 type: string
 *                 description: Driver ID to assign
 *     responses:
 *       200:
 *         description: Driver assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Route'
 *       400:
 *         description: Bad request - Invalid driver assignment
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 *       404:
 *         description: Route not found
 */
router.post(
  "/:id/assign-driver",
  authenticate,
  requireRole(["Admin", "SalesRep"]),
  routeController.assignDriver
);

/**
 * @swagger
 * /routes/{id}/start:
 *   post:
 *     summary: Start a route
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route started successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Route'
 *       400:
 *         description: Bad request - Cannot start route
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 *       404:
 *         description: Route not found
 */
router.post(
  "/:id/start",
  authenticate,
  requireRole(["Admin", "SalesRep", "Driver"]),
  routeController.startRoute
);

/**
 * @swagger
 * /routes/{id}/complete:
 *   post:
 *     summary: Complete a route
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Route'
 *       400:
 *         description: Bad request - Cannot complete route
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 *       404:
 *         description: Route not found
 */
router.post(
  "/:id/complete",
  authenticate,
  requireRole(["Admin", "SalesRep", "Driver"]),
  routeController.completeRoute
);

/**
 * @swagger
 * /routes/{id}/stops/{stopId}/complete:
 *   post:
 *     summary: Complete a specific stop on a route
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Route ID
 *       - in: path
 *         name: stopId
 *         schema:
 *           type: string
 *         required: true
 *         description: Stop ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Notes about the stop completion
 *               actualDuration:
 *                 type: integer
 *                 description: Actual duration spent at stop (minutes)
 *     responses:
 *       200:
 *         description: Stop completed successfully
 *       400:
 *         description: Bad request - Cannot complete stop
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 *       404:
 *         description: Route or stop not found
 */
router.post(
  "/:id/stops/:stopId/complete",
  authenticate,
  requireRole(["Admin", "SalesRep", "Driver"]),
  routeController.completeStop
);

module.exports = router;
