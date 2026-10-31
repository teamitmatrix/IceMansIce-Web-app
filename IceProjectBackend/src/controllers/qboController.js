const qboService = require("../services/quickbooksService");
const logger = require("../utils/logger");
const { ValidationError } = require("../utils/errors");
const QuickBooksConnectionTable = require("../models/QuickBooksConnectionTable");
const { getDAL } = require("../dal");

/**
 * Start QuickBooks OAuth flow
 */
async function startOAuth(req, res, next) {
  try {
    // Debug logging
    logger.info("OAuth start request received", {
      hasUser: !!req.user,
      userId: req.user?.id,
      authHeader: req.headers.authorization ? "present" : "missing",
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    // Ensure user is authenticated
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    if (!req.user || !userId) {
      logger.warn("OAuth start failed - no user authentication", {
        hasUser: !!req.user,
        userId,
        authHeader: req.headers.authorization,
      });
      throw new ValidationError(
        "User authentication required to start OAuth flow"
      );
    }

    // Use the authenticated user ID as the state parameter
    const state = userId;

    logger.info("Starting QuickBooks OAuth flow", {
      userId: req.user.id,
      state: state?.substring(0, 10) + "...",
    });

    // Basic config validation to avoid silent 400s
    const cfgErrors = [];
    const cfg = require("../config").quickbooks;
    if (!cfg.clientId) cfgErrors.push("QBO_CLIENT_ID missing");
    if (!cfg.clientSecret) cfgErrors.push("QBO_CLIENT_SECRET missing");
    if (!cfg.redirectUri) cfgErrors.push("QBO_REDIRECT_URI missing");
    if (cfgErrors.length) {
      throw new ValidationError(
        `QuickBooks configuration error: ${cfgErrors.join(", ")}`
      );
    }

    const authUrl = await qboService.generateAuthUrl(state);

    res.json({
      success: true,
      data: {
        authUrl,
        state, // Include state in response for debugging
      },
    });
  } catch (error) {
    logger.error("Failed to start OAuth flow", { error: error.message });
    next(error);
  }
}

/**
 * Handle QuickBooks OAuth callback
 */
async function handleOAuthCallback(req, res, next) {
  try {
    console.log("=== OAuth Callback Handler Started ===");
    console.log("Query params:", req.query);
    console.log("Headers:", req.headers);
    
    const { code, realmId, state } = req.query;
    console.log("Extracted params:", { code: code?.substring(0, 10) + "...", realmId, state });
    
    if (!code || !realmId) {
      console.log("Missing required params");
      throw new ValidationError("Authorization code and realm ID are required");
    }

    // Extract userId from state parameter - with fallback handling
    const userId = state;

    if (!userId) {
      console.log("Missing userId in state - this might be a test connection");
      // For testing purposes, let's allow callback without state but log it
      logger.warn("OAuth callback received without user ID in state parameter", {
        code: code?.substring(0, 10) + "...",
        realmId,
        state,
      });
      
      // Return a simple HTML response for testing
      return res.send(`
        <html>
          <body>
            <h2>QuickBooks OAuth Callback Received</h2>
            <p>Code: ${code?.substring(0, 10)}...</p>
            <p>Realm ID: ${realmId}</p>
            <p>State: ${state || 'Not provided'}</p>
            <p>Warning: No user ID found in state parameter. Please initiate OAuth from the admin panel.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          </body>
        </html>
      `);
    }

    logger.info("QuickBooks OAuth callback received", {
      code: code?.substring(0, 10) + "...",
      realmId,
      userId,
    });

    const result = await qboService.handleCallback(code, realmId, userId);
    console.log("=== QuickBooks service result ===");
    console.log(result);

    // Always redirect to frontend after successful OAuth (QuickBooks OAuth flow is always browser-based)
    const frontendUrl = require("../config").frontend.url;
    
    // Redirect to success page with token status to avoid immediate "expired" check
    const redirectTo = `${frontendUrl}/admin/quickbooks?connected=true&status=success&company=${encodeURIComponent(
      result.companyName || "IcemansIce Company LLC"
    )}&realmId=${encodeURIComponent(realmId)}&tokenExpires=${encodeURIComponent(result.expiresAt.toISOString())}&timestamp=${Date.now()}`;
    
    console.log("=== Redirect URL ===");
    console.log(redirectTo);
    
    logger.info("Redirecting to frontend after successful OAuth", {
      redirectTo,
      companyName: result.companyName,
      realmId,
      tokenExpiresAt: result.expiresAt
    });
    
    return res.redirect(302, redirectTo);
  } catch (error) {
    console.log("=== ERROR CAUGHT ===");
    console.log("Error message:", error.message);
    console.log("Error stack:", error.stack);
    console.log("Error object:", error);
    
    logger.error("QuickBooks OAuth callback error", {
      error: error.message,
      stack: error.stack,
      code: req.query.code?.substring(0, 10) + "...",
      realmId: req.query.realmId,
      state: req.query.state,
    });
    
    // Send HTML error response instead of JSON for OAuth callback
    return res.status(500).send(`
      <html>
        <body>
          <h2>QuickBooks OAuth Error</h2>
          <p>Error: ${error.message}</p>
          <p>Please close this window and try again from the admin panel.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 5000);
          </script>
        </body>
      </html>
    `);
  }
}

/**
 * Get QuickBooks OAuth status
 */
async function getOAuthStatus(req, res, next) {
  try {
    const status = await qboService.getOAuthStatus(req.user.id);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Disconnect QuickBooks OAuth connection
 */
async function disconnectOAuth(req, res, next) {
  try {
    await qboService.disconnectOAuth(req.user.id);

    res.json({
      success: true,
      data: {
        message: "QuickBooks OAuth connection disconnected successfully",
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Trigger end-of-day sales sync to QuickBooks
 */
async function syncEndOfDaySales(req, res, next) {
  try {
    const { date, warehouseId } = req.body;

    if (!date) {
      throw new ValidationError("Date is required");
    }

    const result = await qboService.syncEndOfDaySales(date, warehouseId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Trigger inventory sync to QuickBooks
 */
async function syncInventory(req, res, next) {
  try {
    const { warehouseId, productIds } = req.body;

    const result = await qboService.syncInventory(warehouseId, productIds);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Trigger payment sync to QuickBooks
 */
async function syncPayments(req, res, next) {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      throw new ValidationError("Start date and end date are required");
    }

    const result = await qboService.syncPayments(startDate, endDate);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get sync job status
 */
async function getSyncStatus(req, res, next) {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      throw new ValidationError("Job ID is required");
    }

    const status = await qboService.getSyncJobStatus(jobId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle QuickBooks webhook
 */
async function handleWebhook(req, res, next) {
  try {
    const { body, headers } = req;

    // Verify webhook signature
    const isValid = await qboService.verifyWebhookSignature(headers, body);

    if (!isValid) {
      logger.warn("Invalid QuickBooks webhook signature", { headers, body });
      return res.status(401).json({
        success: false,
        error: "Invalid webhook signature",
      });
    }

    // Process webhook
    await qboService.processWebhook(body);

    logger.info("QuickBooks webhook processed successfully", { body });

    res.json({
      success: true,
      data: {
        message: "Webhook received and processed",
      },
    });
  } catch (error) {
    logger.error("Error processing QuickBooks webhook", error);
    next(error);
  }
}

/**
 * Get QuickBooks connection details
 */
async function getConnectionDetails(req, res, next) {
  try {
    const userId = req.user.id;

    const connection = await QuickBooksConnectionTable.findActiveByUserId(
      userId
    );

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "No QuickBooks connection found",
      });
    }

    // Debug token expiration
    logger.info("Connection details debug", {
      userId,
      tokenExpiresAt: connection.tokenExpiresAt,
      currentTime: new Date(),
      isTokenExpired: connection.isTokenExpired,
      timeUntilExpiry: connection.tokenExpiresAt ? (connection.tokenExpiresAt - new Date()) : "no expiry",
      companyName: connection.companyName,
    });

    // Don't return sensitive tokens in the response
    const safeConnection = {
      id: connection._id,
      companyName: connection.companyName,
      companyId: connection.companyId,
      realmId: connection.realmId,
      environment: connection.environment,
      isActive: connection.isActive,
      lastSyncAt: connection.lastSyncAt,
      syncStatus: connection.syncStatus,
      syncHistory: connection.syncHistory.slice(-10), // Last 10 syncs
      preferences: connection.preferences,
      isTokenExpired: connection.isTokenExpired,
      needsSync: connection.needsSync,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };

    res.json({
      success: true,
      data: safeConnection,
    });
  } catch (error) {
    logger.error("Failed to get connection details", {
      error: error.message,
      userId: req.user?.id,
    });
    next(error);
  }
}

/**
 * Update QuickBooks connection preferences
 */
async function updateConnectionPreferences(req, res, next) {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;

    const connection = await QuickBooksConnectionTable.findActiveByUserId(
      userId
    );

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "No QuickBooks connection found",
      });
    }

    // Update preferences
    connection.preferences = {
      ...connection.preferences,
      ...preferences,
    };

    await connection.save();

    res.json({
      success: true,
      message: "Preferences updated successfully",
      data: {
        preferences: connection.preferences,
      },
    });
  } catch (error) {
    logger.error("Failed to update connection preferences", {
      error: error.message,
      userId: req.user?.id,
    });
    next(error);
  }
}

/**
 * Update company name from QuickBooks (fallback if OAuth callback failed to fetch it)
 */
async function updateCompanyName(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await qboService.fetchAndUpdateCompanyName(userId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Failed to update company name", {
      error: error.message,
      userId: req.user?.id,
    });
    next(error);
  }
}

module.exports = {
  startOAuth,
  handleOAuthCallback,
  getOAuthStatus,
  disconnectOAuth,
  getConnectionDetails,
  updateConnectionPreferences,
  updateCompanyName,
  syncEndOfDaySales,
  syncInventory,
  syncPayments,
  getSyncStatus,
  handleWebhook,
  // New ad-hoc sync endpoints
  syncCustomers: async (req, res, next) => {
    try {
      logger.info("Customer sync request received", { 
        userId: req.user.id,
        direction: req.query.direction || "from",
        force: req.query.force || "false",
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });
      
      const dal = getDAL();
      const direction = req.query.direction || "from"; // from|to
      const force = String(req.query.force || "false").toLowerCase() === "true";
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      
      logger.info("Parsed sync parameters", { 
        direction, 
        force, 
        startDate, 
        endDate,
        rawForceParam: req.query.force
      });
      
      const result =
        direction === "to"
          ? await qboService.syncCustomersToQbo(req.user.id, dal, { force, startDate, endDate })
          : await qboService.syncCustomersFromQbo(req.user.id, dal, { force, startDate, endDate });
      
      logger.info("Customer sync completed successfully", { 
        userId: req.user.id,
        direction,
        result: { fetched: result.fetched, created: result.created, updated: result.updated }
      });
      
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error("Customer sync failed", {
        error: error.message,
        userId: req.user?.id,
        direction: req.query?.direction,
      });
      next(error);
    }
  },
  syncInvoices: async (req, res, next) => {
    try {
      const dal = getDAL();
      const direction = req.query.direction || "from"; // from|to
      const force = String(req.query.force || "false").toLowerCase() === "true";
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      
      const result =
        direction === "to"
          ? await qboService.syncInvoicesToQbo(req.user.id, dal, { force, startDate, endDate })
          : await qboService.syncInvoicesFromQbo(req.user.id, dal, { startDate, endDate });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};
