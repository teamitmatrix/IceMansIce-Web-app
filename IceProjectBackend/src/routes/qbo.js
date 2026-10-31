const express = require("express");
const router = express.Router();
const qboController = require("../controllers/qboController");
const { requireRole } = require("../middleware/rbac");
const { authenticate } = require("../middleware/auth");
const logger = require("../utils/logger");

// Test route to verify QBO routes are working
router.get("/test", (req, res) => {
  res.json({ 
    success: true, 
    message: "QBO routes are working",
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /qbo/oauth/start:
 *   get:
 *     summary: Start QuickBooks OAuth flow
 *     tags: [QuickBooks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OAuth authorization URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authUrl:
 *                   type: string
 *                   description: URL to redirect user for OAuth authorization
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 */
router.get(
  "/oauth/start",
  authenticate,
  requireRole(["admin", "Accountant"]),
  qboController.startOAuth
);

/**
 * @swagger
 * /qbo/oauth/callback:
 *   get:
 *     summary: Handle QuickBooks OAuth callback
 *     tags: [QuickBooks]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Authorization code from QuickBooks
 *       - in: query
 *         name: realmId
 *         schema:
 *           type: string
 *         required: true
 *         description: QuickBooks company ID
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter for security
 *     responses:
 *       200:
 *         description: OAuth completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 companyName:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *       400:
 *         description: Bad request - Invalid parameters
 *       500:
 *         description: Internal server error
 */
router.get("/oauth/callback", (req, res, next) => {
  console.log("OAuth callback route hit:", req.query);
  console.log("Request headers:", req.headers);
  qboController.handleOAuthCallback(req, res, next);
});

/**
 * @swagger
 * /qbo/oauth/status:
 *   get:
 *     summary: Get QuickBooks OAuth status
 *     tags: [QuickBooks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OAuth connection status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: boolean
 *                 companyName:
 *                   type: string
 *                 lastSync:
 *                   type: string
 *                   format: date-time
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get("/oauth/status", authenticate, qboController.getOAuthStatus);

/**
 * @swagger
 * /qbo/company/update-name:
 *   post:
 *     summary: Update company name from QuickBooks (fallback if OAuth failed to fetch it)
 *     tags: [QuickBooks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company name updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 companyName:
 *                   type: string
 *                 updated:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No QuickBooks connection found
 */
router.post("/company/update-name", authenticate, qboController.updateCompanyName);

/**
 * @swagger
 * /qbo/connection/details:
 *   get:
 *     summary: Get QuickBooks connection details
 *     tags: [QuickBooks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection details retrieved successfully
 *       404:
 *         description: No QuickBooks connection found
 */
router.get(
  "/connection/details",
  authenticate,
  qboController.getConnectionDetails
);

/**
 * @swagger
 * /qbo/connection/preferences:
 *   put:
 *     summary: Update QuickBooks connection preferences
 *     tags: [QuickBooks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferences:
 *                 type: object
 *                 properties:
 *                   autoSync:
 *                     type: boolean
 *                   syncInterval:
 *                     type: number
 *                   syncTypes:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [customers, invoices, products]
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *       404:
 *         description: No QuickBooks connection found
 */
router.put(
  "/connection/preferences",
  authenticate,
  qboController.updateConnectionPreferences
);

/**
 * @swagger
 * /qbo/oauth/disconnect:
 *   post:
 *     summary: Disconnect QuickBooks OAuth connection
 *     tags: [QuickBooks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OAuth disconnected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 */
router.post(
  "/oauth/disconnect",
  authenticate,
  requireRole(["Admin", "Accountant"]),
  qboController.disconnectOAuth
);

/**
 * @swagger
 * /qbo/sync/end-of-day:
 *   post:
 *     summary: Trigger end-of-day sales sync to QuickBooks
 *     tags: [QuickBooks]
 *     security:
 *       - bearerAuth: []
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
 *                 description: Date for end-of-day sync (YYYY-MM-DD)
 *               warehouseId:
 *                 type: string
 *                 description: Optional warehouse filter
 *     responses:
 *       200:
 *         description: Sync job queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 jobId:
 *                   type: string
 *                 estimatedDuration:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 *       400:
 *         description: Bad request - Invalid parameters
 */
router.post(
  "/sync/end-of-day",
  authenticate,
  requireRole(["Admin", "Accountant"]),
  qboController.syncEndOfDaySales
);

// Removed product/inventory sync per requirements

/**
 * @swagger
 * /qbo/sync/payments:
 *   post:
 *     summary: Trigger payment sync to QuickBooks
 *     tags: [QuickBooks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Start date for payment sync
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: End date for payment sync
 *     responses:
 *       200:
 *         description: Payment sync job queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 jobId:
 *                   type: string
 *                 estimatedDuration:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 */
router.post(
  "/sync/payments",
  authenticate,
  requireRole(["Admin", "Accountant"]),
  qboController.syncPayments
);

/**
 * @swagger
 * /qbo/sync/customers:
 *   post:
 *     summary: Sync local customers to QuickBooks
 *     tags: [QuickBooks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customers sync triggered
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 */
router.post(
  "/sync/customers",
  authenticate,
  requireRole(["Admin", "Accountant"]),
  qboController.syncCustomers
);

/**
 * @swagger
 * /qbo/sync/invoices:
 *   post:
 *     summary: Sync invoices with QuickBooks
 *     tags: [QuickBooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [from, to]
 *         description: Direction of sync (from=QBO -> app, to=app -> QBO)
 *     responses:
 *       200:
 *         description: Invoices sync triggered
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 */
router.post(
  "/sync/invoices",
  authenticate,
  requireRole(["Admin", "Accountant"]),
  qboController.syncInvoices
);

// Direct sync endpoints (queues disabled)
router.post(
  "/sync/jobs",
  authenticate,
  requireRole(["Admin", "Accountant"]),
  async (req, res, next) => {
    try {
      const { type } = req.body; // customers | invoices
      const { startDate, endDate } = req.query;
      const force = String(req.query.force || "false").toLowerCase() === "true";
      
      if (!["customers", "invoices"].includes(type)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid sync type. Must be 'customers' or 'invoices'" 
        });
      }

      logger.info(`Starting direct ${type} sync`, { 
        userId: req.user.id, 
        type,
        force,
        startDate,
        endDate
      });
      
      // Use direct sync methods since queues are disabled
      const { getDAL } = require("../dal");
      const qboService = require("../services/quickbooksService");
      const dal = getDAL();
      
      let result;
      if (type === "customers") {
        result = await qboService.syncCustomersFromQbo(req.user.id, dal, { force, startDate, endDate });
      } else if (type === "invoices") {
        // Add extra timeout protection for invoices since they tend to hang
        const invoiceTimeout = process.env.QBO_INVOICE_TIMEOUT || 900000; // 15 minutes default (increased from 6 minutes for large datasets)
        logger.info(`Starting invoice sync with ${invoiceTimeout}ms timeout`);
        
        result = await Promise.race([
          qboService.syncInvoicesFromQbo(req.user.id, dal, { force, startDate, endDate }),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Invoice sync timed out after ${invoiceTimeout}ms`));
            }, invoiceTimeout);
          })
        ]);
      }
      
      logger.info(`Direct ${type} sync completed`, { 
        userId: req.user.id, 
        type,
        rawResult: result, // Log the full result object
        result: { 
          fetched: result?.fetched || 0, 
          created: result?.created || 0, 
          updated: result?.updated || 0 
        }
      });
      
      // Ensure we have valid numbers for the response
      const responseResult = {
        fetched: result?.fetched || 0,
        created: result?.created || 0, 
        updated: result?.updated || 0,
        errors: result?.errors || []
      };
      
      logger.info(`Sending response with counts`, responseResult);
      
      // Return immediate result since we're doing direct sync
      res.json({ 
        success: true, 
        data: { 
          jobId: `direct-${type}-${Date.now()}`, // Generate a fake job ID for compatibility
          status: "completed",
          result: responseResult
        } 
      });
    } catch (e) {
      console.error("=== DIRECT SYNC JOB FAILED ===");
      console.error("User ID:", req.user?.id);
      console.error("Sync Type:", req.body?.type);
      console.error("Error Message:", e.message);
      console.error("Error Stack:", e.stack);
      console.error("Is Timeout:", e.message.includes('timeout'));
      console.error("=== END SYNC JOB ERROR ===");
      
      logger.error("Direct sync job failed", { 
        error: e.message, 
        stack: e.stack,
        userId: req.user?.id, 
        type: req.body?.type,
        isTimeout: e.message.includes('timeout'),
        timestamp: new Date().toISOString()
      });
      
      // Return structured error response
      res.status(500).json({
        success: false,
        message: "Sync job failed",
        error: e.message,
        isTimeout: e.message.includes('timeout')
      });
    }
  }
);

router.get(
  "/sync/jobs/:jobId",
  authenticate,
  requireRole(["Admin", "Accountant"]),
  async (req, res, next) => {
    try {
      // Since we're using direct sync, check if it's a direct job ID
      if (req.params.jobId.startsWith('direct-')) {
        // For direct sync jobs, they're already completed
        return res.json({ 
          success: true, 
          data: { 
            jobId: req.params.jobId,
            status: "completed",
            progress: 100,
            message: "Direct sync completed successfully"
          } 
        });
      }
      
      // Fallback for legacy queue-based jobs (if queues were enabled)
      const { getJobStatus } = require("../jobs/qboSync");
      const status = await getJobStatus(req.params.jobId);
      if (!status)
        return res
          .status(404)
          .json({ success: false, message: "Job not found" });

      // Normalize error messages to avoid "null" on the client
      if (status.status === "failed") {
        const message =
          status.failedReason ||
          status?.result?.message ||
          "Sync job failed";
        return res.json({ success: true, data: { ...status, message } });
      }

      res.json({ success: true, data: status });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @swagger
 * /qbo/sync/status/{jobId}:
 *   get:
 *     summary: Get sync job status
 *     tags: [QuickBooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         schema:
 *           type: string
 *         required: true
 *         description: Sync job ID
 *     responses:
 *       200:
 *         description: Sync job status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, running, completed, failed]
 *                 progress:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 100
 *                 message:
 *                   type: string
 *                 startedAt:
 *                   type: string
 *                   format: date-time
 *                 completedAt:
 *                   type: string
 *                   format: date-time
 *                 error:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Job not found
 */
router.get("/sync/status/:jobId", authenticate, qboController.getSyncStatus);

/**
 * @swagger
 * /qbo/webhook:
 *   post:
 *     summary: QuickBooks webhook endpoint
 *     tags: [QuickBooks]
 *     description: Receives webhooks from QuickBooks for real-time updates
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: QuickBooks webhook payload
 *     responses:
 *       200:
 *         description: Webhook received successfully
 *       400:
 *         description: Invalid webhook payload
 *       401:
 *         description: Invalid webhook signature
 */
router.post("/webhook", qboController.handleWebhook);

module.exports = router;
