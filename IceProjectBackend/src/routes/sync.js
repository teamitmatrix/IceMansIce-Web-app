const express = require("express");
const router = express.Router();
const syncController = require("../controllers/syncController");
const { authenticate } = require("../middleware/auth");

/**
 * @swagger
 * /sync/push:
 *   post:
 *     summary: Push client changes to server for offline sync
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientId:
 *                 type: string
 *                 description: Unique client identifier
 *               clientVersion:
 *                 type: string
 *                 description: Client version for conflict detection
 *               changes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     entityType:
 *                       type: string
 *                       enum: [Customer, Product, SalesOrder, Invoice, Payment, InventoryMovement]
 *                       description: Type of entity being changed
 *                     entityId:
 *                       type: string
 *                       description: Entity ID (null for new entities)
 *                     operation:
 *                       type: string
 *                       enum: [create, update, delete]
 *                       description: Operation type
 *                     payload:
 *                       type: object
 *                       description: Entity data
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       description: When the change was made on client
 *     responses:
 *       200:
 *         description: Changes processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 processed:
 *                   type: number
 *                   description: Number of changes processed
 *                 conflicts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       entityType:
 *                         type: string
 *                       entityId:
 *                         type: string
 *                       conflictType:
 *                         type: string
 *                       serverVersion:
 *                         type: string
 *                       clientVersion:
 *                         type: string
 *                       message:
 *                         type: string
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       entityType:
 *                         type: string
 *                       entityId:
 *                         type: string
 *                       error:
 *                         type: string
 *       400:
 *         description: Bad request - Invalid sync data
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Conflict - Version mismatch
 */
router.post("/push", authenticate, syncController.pushChanges);

/**
 * @swagger
 * /sync/pull:
 *   get:
 *     summary: Pull server changes for offline sync
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *         description: Timestamp to get changes since
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Client identifier
 *       - in: query
 *         name: entityTypes
 *         schema:
 *           type: string
 *         description: Comma-separated list of entity types to sync
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Maximum number of changes to return
 *     responses:
 *       200:
 *         description: Server changes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 serverVersion:
 *                   type: string
 *                   description: Current server version
 *                 changes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       entityType:
 *                         type: string
 *                       entityId:
 *                         type: string
 *                       operation:
 *                         type: string
 *                       payload:
 *                         type: object
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       version:
 *                         type: string
 *                 hasMore:
 *                   type: boolean
 *                   description: Whether there are more changes available
 *                 nextSince:
 *                   type: string
 *                   format: date-time
 *                   description: Timestamp for next sync request
 *       400:
 *         description: Bad request - Invalid parameters
 *       401:
 *         description: Unauthorized
 */
router.get("/pull", authenticate, syncController.pullChanges);

/**
 * @swagger
 * /sync/status:
 *   get:
 *     summary: Get sync status for a client
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Client identifier
 *     responses:
 *       200:
 *         description: Sync status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientId:
 *                   type: string
 *                 lastSync:
 *                   type: string
 *                   format: date-time
 *                 serverVersion:
 *                   type: string
 *                 clientVersion:
 *                   type: string
 *                 pendingChanges:
 *                   type: number
 *                 syncStatus:
 *                   type: string
 *                   enum: [synced, pending, conflict, error]
 *       400:
 *         description: Bad request - Missing clientId
 *       401:
 *         description: Unauthorized
 */
router.get("/status", authenticate, syncController.getSyncStatus);

/**
 * @swagger
 * /sync/resolve-conflict:
 *   post:
 *     summary: Resolve a sync conflict
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientId:
 *                 type: string
 *                 description: Client identifier
 *               entityType:
 *                 type: string
 *                 description: Type of entity with conflict
 *               entityId:
 *                 type: string
 *                 description: Entity ID
 *               resolution:
 *                 type: string
 *                 enum: [client-wins, server-wins, merge]
 *                 description: Conflict resolution strategy
 *               clientData:
 *                 type: object
 *                 description: Client version of the data (for merge resolution)
 *               serverData:
 *                 type: object
 *                 description: Server version of the data (for merge resolution)
 *     responses:
 *       200:
 *         description: Conflict resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 resolvedEntity:
 *                   type: object
 *                   description: Final resolved entity
 *                 newVersion:
 *                   type: string
 *                   description: New version after resolution
 *       400:
 *         description: Bad request - Invalid resolution data
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Conflict - Unable to resolve
 */
router.post("/resolve-conflict", authenticate, syncController.resolveConflict);

/**
 * @swagger
 * /sync/clear-queue:
 *   post:
 *     summary: Clear sync queue for a client
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientId:
 *                 type: string
 *                 description: Client identifier
 *               entityType:
 *                 type: string
 *                 description: Optional entity type filter
 *     responses:
 *       200:
 *         description: Sync queue cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 clearedCount:
 *                   type: number
 *                   description: Number of items cleared
 *       400:
 *         description: Bad request - Missing clientId
 *       401:
 *         description: Unauthorized
 */
router.post("/clear-queue", authenticate, syncController.clearSyncQueue);

module.exports = router;
