const QuickBooks = require("node-quickbooks");
const axios = require("axios");
const config = require("../config");
const logger = require("../utils/logger");
const { NotImplementedError } = require("../utils/errors");
const QuickBooksConnection = require("../models/QuickBooksConnection");
const QuickBooksConnectionTable = require("../models/QuickBooksConnectionTable");
const Customer = require("../models/Customer");

// Best-effort formatter for QuickBooks SDK errors
function formatQboError(err) {
  if (!err) return "Unknown error";
  try {
    const fault = err.Fault || err.fault || err.IntuitResponse?.Fault;
    const first = Array.isArray(fault?.Error) ? fault.Error[0] : fault?.Error;
    const code = first?.code || first?.Code;
    const msg = first?.Message || first?.message;
    const detail = first?.Detail || first?.detail;
    const parts = [];
    if (code) parts.push(`code ${code}`);
    if (msg) parts.push(msg);
    if (detail) parts.push(detail);
    if (parts.length) return parts.join(": ");
    if (typeof err.message === "string" && err.message) return err.message;
    if (typeof err === "string") return err;
    // Try body text
    if (err.body && typeof err.body === "string") return err.body.slice(0, 300);
    return JSON.stringify(err, Object.getOwnPropertyNames(err)).slice(0, 300);
  } catch {
    return String(err?.message || "Unknown error");
  }
}

class QuickBooksService {
  constructor() {
    // Set OAuth version for QuickBooks
    QuickBooks.setOauthVersion("2.0");

    // Use crypto.constants instead of deprecated constants module
    const crypto = require('crypto');
    const tlsConstants = crypto.constants;

    // OAuth endpoints
    this.oauthEndpoints = {
      authorization: "https://appcenter.intuit.com/connect/oauth2",
      token: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
      revoke: "https://developer.api.intuit.com/v2/oauth2/tokens/revoke",
    };

    // Configure axios with enhanced SSL/TLS settings for cloud compatibility
    const isCloudPlatform = config.quickbooks.isCloudPlatform;
    
    // Enhanced cipher suites for cloud platforms
    const cloudCiphers = [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384',
      'AES128-GCM-SHA256',
      'AES256-GCM-SHA384',
      'AES128-SHA256',
      'AES256-SHA256',
      'ECDHE-RSA-AES128-SHA',      // Added for cloud compatibility
      'ECDHE-RSA-AES256-SHA',      // Added for cloud compatibility
      'AES128-SHA',                // Added for cloud compatibility
      'AES256-SHA'                 // Added for cloud compatibility
    ].join(':');

    const modernCiphers = [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384',
      'AES128-GCM-SHA256',
      'AES256-GCM-SHA384',
      'AES128-SHA256',
      'AES256-SHA256'
    ].join(':');

    this.httpClient = axios.create({
      timeout: isCloudPlatform ? 60000 : 30000, // Extended timeout for cloud
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'PWA-API/1.0.0 (Node.js)',
      },
      // Enhanced SSL/TLS configuration for better compatibility with cloud platforms
      httpsAgent: new (require('https').Agent)({
        // Use configurable TLS version for better cloud platform compatibility
        secureProtocol: config.quickbooks.tlsVersion,
        rejectUnauthorized: config.quickbooks.sslVerify,
        keepAlive: true,
        keepAliveMsecs: 30000,
        // Simplified cipher list for better compatibility on cloud platforms
        ciphers: [
          'ECDHE-RSA-AES128-GCM-SHA256',
          'ECDHE-RSA-AES256-GCM-SHA384',
          'AES128-GCM-SHA256',
          'AES256-GCM-SHA384'
        ].join(':'),
        honorCipherOrder: true,
        // Set minimum TLS version for security
        secureOptions: tlsConstants.SSL_OP_NO_SSLv2 | tlsConstants.SSL_OP_NO_SSLv3 | tlsConstants.SSL_OP_NO_TLSv1 | tlsConstants.SSL_OP_NO_TLSv1_1,
      }),
    });
  }

  // Record a sync history entry in QuickBooksConnectionTable (best-effort)
  /**
   * Fetch and update company name (fallback method)
   */
  async fetchAndUpdateCompanyName(userId) {
    try {
      const connection = await QuickBooksConnection.findActiveByUserId(userId);
      if (!connection) {
        throw new Error("No active QuickBooks connection found");
      }

      const qbo = this.getQboClient(
        connection.realmId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      const companyInfo = await new Promise((resolve, reject) => {
        qbo.getCompanyInfo((err, company) => {
          if (err) {
            reject(err);
          } else {
            resolve(company);
          }
        });
      });

      const companyName = companyInfo.Name || 
                         companyInfo.CompanyName || 
                         companyInfo.name || 
                         companyInfo.companyName ||
                         "IcemansIce Company LLC"; // Use your actual company name as fallback

      // Update both connection tables
      await QuickBooksConnection.findOneAndUpdate({ userId }, { companyName });
      await QuickBooksConnectionTable.findOneAndUpdate({ userId }, { companyName });

      logger.info("Company name updated successfully", { userId, companyName });

      return { companyName, updated: true };
    } catch (error) {
      logger.error("Failed to fetch and update company name", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  async recordSyncHistory(userId, syncType, status, recordsCount = 0, errorMessage = null) {
    try {
      const conn = await QuickBooksConnectionTable.findActiveByUserId(userId);
      if (!conn) return;
      await conn.addSyncHistory(syncType, status, recordsCount, errorMessage);
    } catch (e) {
      logger.warn("Failed to record sync history", {
        userId,
        syncType,
        status,
        error: e?.message,
      });
    }
  }

  /**
   * Ensure we have a valid, non-expired access token for the user.
   * Attempts a refresh if expired, otherwise throws a clear actionable error.
   */
  async ensureValidConnection(userId) {
    const connection = await QuickBooksConnection.findActiveByUserId(userId);
    if (!connection) {
      throw new Error("No QuickBooks connection found");
    }

    // If token has expired, try to refresh
    // Note: isTokenExpired is a virtual on the model
    if (connection.isTokenExpired) {
      try {
        const tokens = await this.refreshToken(userId, connection.refreshToken);
        // Persist was done in refreshToken; reload to get the latest fields
        const refreshed = await QuickBooksConnection.findActiveByUserId(userId);
        return refreshed || connection; // fallback just in case
      } catch (err) {
        throw new Error(
          "QuickBooks token expired and automatic refresh failed. Please reconnect from Admin > QuickBooks."
        );
      }
    }

    return connection;
  }

  generateAuthUrl(state = "") {
    const authUri =
      this.oauthEndpoints.authorization +
      "?client_id=" +
      config.quickbooks.clientId +
      "&redirect_uri=" +
      encodeURIComponent(config.quickbooks.redirectUri) +
      "&scope=" +
      config.quickbooks.scope +
      "&response_type=code" +
      "&state=" +
      state;

    logger.info("Generated QBO auth URL", { state });
    return authUri;
  }

  async handleCallback(code, realmId, userId) {
    try {
      logger.info("Starting OAuth callback processing", {
        code: code?.substring(0, 10) + "...",
        realmId,
        userId,
      });

      if (!code) {
        throw new Error("Authorization code is required");
      }

      // Exchange authorization code for access token
      const auth = Buffer.from(
        config.quickbooks.clientId + ":" + config.quickbooks.clientSecret
      ).toString("base64");

      logger.info("Preparing token exchange request", {
        tokenUrl: this.oauthEndpoints.token,
        clientId: config.quickbooks.clientId?.substring(0, 8) + "...",
        redirectUri: config.quickbooks.redirectUri,
      });

      logger.info("Making token exchange request...");

      const response = await this.httpClient.post(this.oauthEndpoints.token, {
        grant_type: "authorization_code",
        code: code,
        redirect_uri: config.quickbooks.redirectUri,
      }, {
        headers: {
          Authorization: "Basic " + auth,
        },
      });

      logger.info("Token exchange response received", {
        statusCode: response.status,
        bodyLength: JSON.stringify(response.data).length,
      });

      const data = response.data;
      logger.info("Token exchange successful", {
        hasAccessToken: !!data.access_token,
        hasRefreshToken: !!data.refresh_token,
        expiresIn: data.expires_in,
        tokenResponse: data,
      });

      // Continue processing the token response
      const tokenResponse = data;
      const tokens = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(
          Date.now() + (tokenResponse.expires_in || 3600) * 1000
        ),
        realmId: realmId,
      };

      logger.info("Tokens created successfully", {
        accessTokenLength: tokens.accessToken?.length,
        refreshTokenLength: tokens.refreshToken?.length,
        expiresAt: tokens.expiresAt,
        expiresInMs: (tokens.expiresAt - new Date()),
        currentTime: new Date(),
      });

      // Start with your actual company name (hardcoded for reliability)
      let companyName = "IcemansIce Company LLC";

      // Save or update connection in database first with default name
      const connectionData = {
        userId,
        companyId: realmId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        realmId,
        companyName: companyName, // Will be updated below if we can fetch it
        environment: config.quickbooks.environment,
        isActive: true,
      };

      console.log("=== Saving connection to database ===");
      console.log("Connection data:", { 
        userId, 
        realmId, 
        companyName, 
        environment: config.quickbooks.environment,
        tokenExpiresAt: tokens.expiresAt 
      });

      // Save to both tables for backward compatibility and new features
      const savedConnection = await QuickBooksConnection.findOneAndUpdate({ userId }, connectionData, {
        upsert: true,
        new: true,
      });

      console.log("=== QuickBooksConnection saved ===");

      // Save to the new detailed table
      const savedDetailedConnection = await QuickBooksConnectionTable.findOneAndUpdate(
        { userId },
        {
          ...connectionData,
          syncStatus: "pending",
          syncHistory: [],
          preferences: {
            autoSync: false,
            syncInterval: 3600,
            syncTypes: ["customers", "invoices", "products"],
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

      console.log("=== QuickBooksConnectionTable saved ===");

      logger.info("Connection saved to database", {
        userId,
        tokenExpiresAt: connectionData.tokenExpiresAt,
        savedTokenExpiresAt: savedDetailedConnection.tokenExpiresAt,
        isTokenExpired: savedDetailedConnection.isTokenExpired,
        companyName: connectionData.companyName,
      });

      // Now try to fetch and update the actual company name
      try {
        console.log("=== Attempting to fetch actual company name ===");
        logger.info("Attempting to fetch actual company name...");
        const qbo = this.getQboClient(realmId, tokens.accessToken, realmId, tokens.refreshToken);
        
        const companyInfo = await new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error("Timeout")), 5000); // 5 second timeout
          
          qbo.getCompanyInfo((err, company) => {
            if (err) {
              logger.error("QuickBooks API error fetching company info", { 
                error: err.message,
                errorCode: err.code
              });
              reject(err);
            } else {
              logger.info("Company info API response received", { 
                hasCompany: !!company,
                fields: company ? Object.keys(company) : []
              });
              resolve(company);
            }
          });
        });
        
        if (companyInfo) {
          // QuickBooks API returns different field names, try both
          const actualCompanyName = companyInfo.Name || 
                                   companyInfo.CompanyName || 
                                   companyInfo.name || 
                                   companyInfo.companyName;
          
          if (actualCompanyName) {
            companyName = actualCompanyName;
            logger.info("Successfully retrieved actual company name", { companyName });
            
            // Update the database with the actual company name
            await QuickBooksConnection.findOneAndUpdate({ userId }, { companyName });
            await QuickBooksConnectionTable.findOneAndUpdate({ userId }, { companyName });
            
            logger.info("Company name updated in database", { companyName });
          } else {
            logger.warn("No company name found in API response, using hardcoded name");
            // Keep the hardcoded "IcemansIce Company LLC"
          }
        }
      } catch (error) {
        console.log("=== Company name fetch error (non-fatal) ===");
        console.log("Company fetch error:", error.message);
        logger.warn("Could not fetch company name, using default", { 
          error: error.message 
        });
        // Continue with default name - don't fail the OAuth flow
      }

      logger.info("QBO OAuth callback successful", { realmId, userId });
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        realmId: tokens.realmId,
        companyName: companyName,
      };
    } catch (error) {
      console.log("=== QuickBooks Service Error ===");
      console.log("Error message:", error.message);
      console.log("Error stack:", error.stack);
      console.log("Error in handleCallback:", error);
      
      logger.error("QBO OAuth callback failed", { 
        error: error.message,
        stack: error.stack,
        userId,
        realmId 
      });
      throw error;
    }
  }

  async refreshToken(userId, refreshToken) {
    try {
      const auth = Buffer.from(
        config.quickbooks.clientId + ":" + config.quickbooks.clientSecret
      ).toString("base64");

      logger.info("Attempting to refresh QuickBooks token", { userId });

      const response = await this.httpClient.post(this.oauthEndpoints.token, {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }, {
        headers: {
          Authorization: "Basic " + auth,
        },
      });

      const tokenResponse = response.data;
      logger.info("Token refresh successful", {
        hasAccessToken: !!tokenResponse.access_token,
        hasRefreshToken: !!tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in,
      });

      const tokens = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + (tokenResponse.expires_in || 3600) * 1000),
      };

      // Update both connection tables in database
      const updateData = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
      };

      await QuickBooksConnection.findOneAndUpdate({ userId }, updateData);
      await QuickBooksConnectionTable.findOneAndUpdate({ userId }, updateData);

      logger.info("Database updated with refreshed tokens", { 
        userId,
        newExpiresAt: tokens.expiresAt 
      });

      return tokens;
    } catch (error) {
      logger.error("QBO token refresh failed", {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        userId,
      });
      throw error;
    }
  }

  /**
   * Wraps a promise with a timeout to prevent hanging operations
   * @param {Promise} promise - The promise to wrap
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} operation - Operation name for error messages
   * @returns {Promise} Promise that rejects on timeout
   */
  withTimeout(promise, timeoutMs, operation = "operation") {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }

  getQboClient(tenantId, accessToken, realmId, refreshToken = null) {
    try {
      logger.info("Creating QuickBooks client", {
        tenantId,
        hasAccessToken: !!accessToken,
        realmId,
        hasRefreshToken: !!refreshToken,
        environment: config.quickbooks.environment
      });
      
      // Create an enhanced HTTPS agent for reliable SSL/TLS configuration
      const isCloudPlatform = config.quickbooks.isCloudPlatform;
      
      // Use crypto.constants instead of deprecated constants module
      const crypto = require('crypto');
      const tlsConstants = crypto.constants;
    
    // Enhanced cipher suites for cloud platforms
    const cloudCiphers = [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384',
      'AES128-GCM-SHA256',
      'AES256-GCM-SHA384',
      'AES128-SHA256',
      'AES256-SHA256',
      'ECDHE-RSA-AES128-SHA',      // Added for cloud compatibility
      'ECDHE-RSA-AES256-SHA',      // Added for cloud compatibility
      'AES128-SHA',                // Added for cloud compatibility
      'AES256-SHA'                 // Added for cloud compatibility
    ].join(':');

    const modernCiphers = [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384',
      'AES128-GCM-SHA256',
      'AES256-GCM-SHA384',
      'AES128-SHA256',
      'AES256-SHA256'
    ].join(':');

    const httpsAgent = new (require('https').Agent)({
      // Use TLS_method for maximum compatibility with QuickBooks API
      secureProtocol: config.quickbooks.tlsVersion,
      rejectUnauthorized: config.quickbooks.sslVerify,
      keepAlive: true,
      keepAliveMsecs: 30000,
      // Enhanced configuration for better reliability
      honorCipherOrder: true,
      ciphers: isCloudPlatform ? cloudCiphers : modernCiphers,
      // Additional cloud platform settings
      ...(isCloudPlatform && {
        timeout: 60000,
        maxSockets: 50,
        maxFreeSockets: 10,
        // Additional options for Node.js SSL compatibility
        secureOptions: tlsConstants.SSL_OP_NO_SSLv3 | tlsConstants.SSL_OP_NO_TLSv1,
        checkServerIdentity: function(host, cert) {
          // For debugging - log SSL certificate details
          logger.debug("SSL Certificate check", { 
            host, 
            subject: cert.subject, 
            issuer: cert.issuer,
            valid_from: cert.valid_from,
            valid_to: cert.valid_to
          });
          return undefined; // Use default verification
        }
      })
    });

    const qbo = new QuickBooks(
      config.quickbooks.clientId,
      config.quickbooks.clientSecret,
      accessToken,
      false, // no token secret for OAuth 2.0
      realmId,
      config.quickbooks.environment === "production" ? false : true, // use sandbox for development
      false, // no debug
      null, // minor version
      "2.0", // OAuth version
      refreshToken
    );

    // Configure the QuickBooks client with our enhanced SSL settings
    if (qbo.request) {
      const originalRequest = qbo.request;
      
      // Override the request method to use our HTTPS agent
      qbo.request = function(options, callback) {
        // Ensure HTTPS agent is always used
        if (typeof options === 'string') {
          options = { uri: options };
        }
        
        // Apply enhanced SSL configuration
        options.agent = httpsAgent;
        options.strictSSL = config.quickbooks.sslVerify;
        options.timeout = isCloudPlatform ? 60000 : 30000;
        options.headers = {
          'User-Agent': 'PWA-API/1.0.0 (Node.js)',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        };
        
        // Log the request for debugging
        logger.debug("QuickBooks API request", {
          uri: options.uri,
          method: options.method || 'GET',
          timeout: options.timeout,
          strictSSL: options.strictSSL
        });
        
        // Call the original request with our SSL configuration
        return originalRequest.call(this, options, callback);
      };
      
      // Copy over any properties from the original request
      Object.setPrototypeOf(qbo.request, originalRequest);
      Object.assign(qbo.request, originalRequest);
    }

    // Configure defaults if available
    if (qbo.request && qbo.request.defaults) {
      qbo.request.defaults({
        timeout: 30000,
        // Enhanced SSL/TLS configuration for better cloud platform compatibility
        httpsAgent: new (require('https').Agent)({
          // Use configurable TLS version
          secureProtocol: config.quickbooks.tlsVersion,
          rejectUnauthorized: config.quickbooks.sslVerify,
          keepAlive: true,
          keepAliveMsecs: 30000,
          // Simplified cipher list for better compatibility
          ciphers: [
            'ECDHE-RSA-AES128-GCM-SHA256',
            'ECDHE-RSA-AES256-GCM-SHA384',
            'AES128-GCM-SHA256',
            'AES256-GCM-SHA384'
          ].join(':'),
          honorCipherOrder: true,
          // Set minimum TLS version for security
          secureOptions: tlsConstants.SSL_OP_NO_SSLv2 | tlsConstants.SSL_OP_NO_SSLv3 | tlsConstants.SSL_OP_NO_TLSv1 | tlsConstants.SSL_OP_NO_TLSv1_1,
        }),
      });
    }

    logger.info("QuickBooks client created successfully");
    return qbo;
  } catch (error) {
    logger.error("Error creating QuickBooks client", {
      error: error.message,
      stack: error.stack,
      tenantId,
      hasAccessToken: !!accessToken,
      realmId
    });
    throw error;
  }
}

  async createCustomer(tenantId, customerData) {
    try {
      const connection = await this.ensureValidConnection(tenantId);

      const qbo = this.getQboClient(
        tenantId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      return new Promise((resolve, reject) => {
        qbo.createCustomer(customerData, (err, customer) => {
          if (err) {
            const formattedError = formatQboError(err);
            logger.error("Failed to create customer in QuickBooks", {
              error: formattedError.message,
              code: formattedError.code,
              detail: formattedError.detail,
              tenantId,
              customerData: { Name: customerData.Name }
            });
            reject(formattedError);
          } else {
            logger.info("Customer created successfully in QuickBooks", {
              customerId: customer.Id,
              tenantId,
            });
            resolve(customer);
          }
        });
      });
    } catch (error) {
      logger.error("Error creating customer in QuickBooks", {
        error: error.message,
        tenantId,
      });
      throw error;
    }
  }

  async updateCustomer(tenantId, qboId, customerData) {
    try {
      const connection = await this.ensureValidConnection(tenantId);

      const qbo = this.getQboClient(
        tenantId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      // Fetch current customer to obtain SyncToken
      const existing = await new Promise((resolve, reject) => {
        // node-quickbooks getCustomer expects just the id
        qbo.getCustomer(qboId, (err, customer) => {
          if (err) {
            const formattedError = formatQboError(err);
            logger.error("Failed to get customer for update", {
              error: formattedError.message,
              code: formattedError.code,
              detail: formattedError.detail,
              tenantId,
              qboId,
            });
            return reject(formattedError);
          }
          resolve(customer);
        });
      });

      const payload = {
        ...existing,
        ...customerData,
        Id: existing.Id || qboId,
        SyncToken: existing.SyncToken,
        sparse: true, // only update provided fields
      };

      return await new Promise((resolve, reject) => {
        qbo.updateCustomer(payload, (err, updated) => {
          if (err) {
            const formattedError = formatQboError(err);
            logger.error("Failed to update customer in QuickBooks", {
              error: formattedError.message,
              code: formattedError.code,
              detail: formattedError.detail,
              tenantId,
              qboId,
              customerName: customerData.Name
            });
            return reject(formattedError);
          }
          logger.info("Customer updated successfully in QuickBooks", {
            qboId: updated?.Id || qboId,
            tenantId,
          });
          resolve(updated);
        });
      });
    } catch (error) {
      logger.error("Error updating customer in QuickBooks", {
        error: error.message,
        tenantId,
        qboId,
      });
      throw error;
    }
  }

  async createInvoice(tenantId, invoiceData) {
    try {
      const connection = await this.ensureValidConnection(tenantId);

      const qbo = this.getQboClient(
        tenantId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      return new Promise((resolve, reject) => {
        logger.debug("Creating invoice in QuickBooks", {
          tenantId,
          PONumber: invoiceData.PONumber,
          docNumber: invoiceData.DocNumber,
          customerRef: invoiceData.CustomerRef?.value,
        });
        
        // Log the complete payload being sent to QuickBooks
        logger.info("COMPLETE PAYLOAD SENT TO QUICKBOOKS CREATE:", {
          tenantId,
          payload: JSON.stringify(invoiceData, null, 2)
        });
        
        qbo.createInvoice(invoiceData, (err, invoice) => {
          if (err) {
            const formattedError = formatQboError(err);
            logger.error("Failed to create invoice in QuickBooks", {
              error: formattedError,
              originalError: err.message,
              tenantId,
              errorType: err?.constructor?.name,
              errorCode: err?.code,
              fault: err?.Fault || err?.fault,
            });
            reject(new Error(formattedError));
          } else {
            logger.info("Invoice created successfully in QuickBooks", {
              invoiceId: invoice.Id,
              tenantId,
              createdPONumber: invoice.PONumber,
              COMPLETE_RESPONSE: JSON.stringify(invoice, null, 2)
            });
            resolve(invoice);
          }
        });
      });
      
    } catch (error) {
      logger.error("Error creating invoice in QuickBooks", {
        error: error.message,
        tenantId,
      });
      throw error;
    }
  }

  async updateInvoice(tenantId, qboId, invoiceData) {
    try {
      const connection = await this.ensureValidConnection(tenantId);

      const qbo = this.getQboClient(
        tenantId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      // Fetch existing to obtain SyncToken
      const existing = await new Promise((resolve, reject) => {
        qbo.getInvoice(qboId, (err, invoice) => {
          if (err) {
            const formattedError = formatQboError(err);
            logger.error("Failed to fetch existing invoice from QuickBooks", {
              error: formattedError,
              originalError: err.message,
              tenantId,
              qboId,
            });
            return reject(new Error(formattedError));
          }
          resolve(invoice);
        });
      });

      const payload = {
        ...existing,
        ...invoiceData,
        Id: existing.Id || qboId,
        SyncToken: existing.SyncToken,
        sparse: true,
      };

      // Ensure PONumber is always set (QuickBooks requires explicit field updates with sparse:true)
      if (invoiceData.PONumber) {
        payload.PONumber = invoiceData.PONumber;
      }

      logger.debug("Update invoice payload before sending to QBO", {
        qboId,
        tenantId,
        PONumber: payload.PONumber,
        existingPONumber: existing.PONumber,
        incomingPONumber: invoiceData.PONumber,
        payloadHasPONumber: 'PONumber' in payload,
      });

      // Log complete payload being sent for update
      logger.info("COMPLETE PAYLOAD SENT TO QUICKBOOKS UPDATE:", {
        tenantId,
        qboId,
        payload: JSON.stringify(payload, null, 2)
      });

      return await new Promise((resolve, reject) => {
        qbo.updateInvoice(payload, (err, updated) => {
          if (err) {
            const formattedError = formatQboError(err);
            logger.error("Failed to update invoice in QuickBooks", {
              error: formattedError,
              originalError: err.message,
              tenantId,
              qboId,
              errorType: err?.constructor?.name,
              errorCode: err?.code,
              fault: err?.Fault || err?.fault,
            });
            return reject(new Error(formattedError));
          }
          logger.info("Invoice updated successfully in QuickBooks", {
            qboId: updated?.Id || qboId,
            tenantId,
            updatedPONumber: updated?.PONumber,
            COMPLETE_RESPONSE: JSON.stringify(updated, null, 2)
          });
          resolve(updated);
        });
      });
    } catch (error) {
      logger.error("Error updating invoice in QuickBooks", {
        error: error.message,
        tenantId,
        qboId,
      });
      throw error;
    }
  }

  async createItem(tenantId, itemData) {
    try {
      const connection = await this.ensureValidConnection(tenantId);

      const qbo = this.getQboClient(
        tenantId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      return new Promise((resolve, reject) => {
        qbo.createItem(itemData, (err, item) => {
          if (err) {
            logger.error("Failed to create item in QuickBooks", {
              error: err.message,
              tenantId,
            });
            reject(err);
          } else {
            logger.info("Item created successfully in QuickBooks", {
              itemId: item.Id,
              tenantId,
            });
            resolve(item);
          }
        });
      });
    } catch (error) {
      logger.error("Error creating item in QuickBooks", {
        error: error.message,
        tenantId,
      });
      throw error;
    }
  }

  async updateItem(tenantId, qboId, itemData) {
    throw new NotImplementedError("updateItem not implemented yet");
  }

  async syncEndOfDaySales(tenantId, date) {
    throw new NotImplementedError("syncEndOfDaySales not implemented yet");
  }

  async updateInventory(tenantId, inventoryData) {
    throw new NotImplementedError("updateInventory not implemented yet");
  }

  async matchPayment(tenantId, paymentData) {
    throw new NotImplementedError("matchPayment not implemented yet");
  }

  /**
   * Create a payment in QuickBooks and link it to an invoice
   * @param {string} tenantId - The tenant ID
   * @param {object} paymentData - Payment data
   * @param {string} paymentData.invoiceQboId - QuickBooks Invoice ID to apply payment to
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.paymentMethod - Payment method (cash, check, creditcard, etc.)
   * @param {Date} paymentData.txnDate - Transaction date
   * @param {string} paymentData.paymentRefNum - Payment reference number (optional)
   * @returns {Promise<object>} Created payment object
   */
  async createPayment(tenantId, paymentData) {
    try {
      const connection = await this.ensureValidConnection(tenantId);

      const qbo = this.getQboClient(
        tenantId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      // First, get the invoice to find the customer
      const invoice = await new Promise((resolve, reject) => {
        qbo.getInvoice(paymentData.invoiceQboId, (err, inv) => {
          if (err) {
            logger.error("Failed to fetch invoice for payment", {
              error: err.message,
              invoiceQboId: paymentData.invoiceQboId,
              tenantId,
            });
            reject(err);
          } else {
            resolve(inv);
          }
        });
      });

      // Map payment method to QuickBooks payment method ref
      const paymentMethodMap = {
        cash: "Cash",
        check: "Check",
        online: "CreditCard",
        creditcard: "CreditCard",
      };

      const qboPaymentMethod = paymentMethodMap[paymentData.paymentMethod?.toLowerCase()] || "Cash";

      // Build payment payload
      const paymentPayload = {
        CustomerRef: invoice.CustomerRef,
        TotalAmt: paymentData.amount,
        TxnDate: paymentData.txnDate ? new Date(paymentData.txnDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        PaymentRefNum: paymentData.paymentRefNum || undefined,
        Line: [
          {
            Amount: paymentData.amount,
            LinkedTxn: [
              {
                TxnId: paymentData.invoiceQboId,
                TxnType: "Invoice",
              },
            ],
          },
        ],
      };

      // Create payment in QuickBooks
      return new Promise((resolve, reject) => {
        qbo.createPayment(paymentPayload, (err, payment) => {
          if (err) {
            const formattedError = formatQboError(err);
            logger.error("Failed to create payment in QuickBooks", {
              error: formattedError,
              originalError: err.message,
              tenantId,
              invoiceQboId: paymentData.invoiceQboId,
              amount: paymentData.amount,
            });
            reject(new Error(formattedError));
          } else {
            logger.info("Payment created successfully in QuickBooks", {
              paymentId: payment.Id,
              invoiceQboId: paymentData.invoiceQboId,
              amount: paymentData.amount,
              tenantId,
            });
            resolve(payment);
          }
        });
      });
    } catch (error) {
      logger.error("Error creating payment in QuickBooks", {
        error: error.message,
        tenantId,
        paymentData,
      });
      throw error;
    }
  }

  /**
   * Sync payment for an invoice to QuickBooks
   * This function checks if payment exists in QBO and creates/updates it
   * @param {string} tenantId - The tenant ID
   * @param {object} invoice - Invoice object with amountPaid and qboId
   */
  async syncPaymentForInvoice(tenantId, invoice) {
    if (!invoice.qboId) {
      throw new Error("Invoice must have qboId to sync payment");
    }

    if (!invoice.amountPaid || invoice.amountPaid <= 0) {
      logger.info("No payment to sync for invoice", {
        invoiceNumber: invoice.invoiceNumber,
        amountPaid: invoice.amountPaid,
      });
      return;
    }

    try {
      const connection = await this.ensureValidConnection(tenantId);
      const qbo = this.getQboClient(
        tenantId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      // Get the invoice from QuickBooks to check existing payments
      const qboInvoice = await new Promise((resolve, reject) => {
        qbo.getInvoice(invoice.qboId, (err, inv) => {
          if (err) {
            reject(err);
          } else {
            resolve(inv);
          }
        });
      });

      // Calculate how much has already been paid in QuickBooks
      const existingPayments = qboInvoice.LinkedTxn?.filter(txn => txn.TxnType === "Payment") || [];
      const qboAmountPaid = existingPayments.reduce((sum, txn) => {
        // Note: LinkedTxn doesn't always have Amount, need to fetch actual payment
        return sum;
      }, 0);

      // For simplicity, we'll check the invoice balance in QuickBooks
      const qboBalance = Number(qboInvoice.Balance) || 0;
      const qboPaid = Number(qboInvoice.TotalAmt || 0) - qboBalance;

      const localAmountPaid = Number(invoice.amountPaid) || 0;
      const paymentDifference = localAmountPaid - qboPaid;

      logger.info("Payment sync analysis", {
        invoiceNumber: invoice.invoiceNumber,
        qboId: invoice.qboId,
        localAmountPaid,
        qboPaid,
        qboBalance,
        paymentDifference,
        existingPaymentsCount: existingPayments.length,
      });

      // If there's a payment difference, create a payment record
      if (paymentDifference > 0.01) { // Use 0.01 to account for rounding
        const paymentData = {
          invoiceQboId: invoice.qboId,
          amount: paymentDifference,
          paymentMethod: invoice.paymentMethod || "cash",
          txnDate: invoice.updatedAt || new Date(),
          paymentRefNum: `INV-${invoice.invoiceNumber}`,
        };

        const payment = await this.createPayment(tenantId, paymentData);
        
        logger.info("Payment created in QuickBooks", {
          invoiceNumber: invoice.invoiceNumber,
          paymentId: payment.Id,
          amount: paymentDifference,
        });

        return payment;
      } else if (paymentDifference < -0.01) {
        logger.warn("Local payment is less than QuickBooks payment - skipping", {
          invoiceNumber: invoice.invoiceNumber,
          localAmountPaid,
          qboPaid,
        });
      } else {
        logger.info("Payment already in sync", {
          invoiceNumber: invoice.invoiceNumber,
          amount: localAmountPaid,
        });
      }
    } catch (error) {
      logger.error("Error syncing payment for invoice", {
        error: error.message,
        invoiceNumber: invoice.invoiceNumber,
        qboId: invoice.qboId,
      });
      throw error;
    }
  }

  async getCustomer(tenantId, qboId) {
    try {
      const connection = await this.ensureValidConnection(tenantId);

      const qbo = this.getQboClient(
        tenantId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      return new Promise((resolve, reject) => {
        qbo.getCustomer(connection.realmId, qboId, (err, customer) => {
          if (err) {
            logger.error("Failed to get customer from QuickBooks", {
              error: err.message,
              tenantId,
              qboId,
            });
            reject(err);
          } else {
            logger.info("Customer retrieved from QuickBooks", {
              qboId,
              tenantId,
            });
            resolve(customer);
          }
        });
      });
    } catch (error) {
      logger.error("Error getting customer from QuickBooks", {
        error: error.message,
        tenantId,
        qboId,
      });
      throw error;
    }
  }

  async findCustomerByEmail(tenantId, email) {
    try {
      const connection = await this.ensureValidConnection(tenantId);

      const qbo = this.getQboClient(
        tenantId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      return new Promise((resolve, reject) => {
        qbo.findCustomers({ PrimaryEmailAddr: email }, (err, customers) => {
          if (err) {
            logger.error("Failed to find customer by email", {
              error: err.message,
              tenantId,
              email,
            });
            reject(err);
          } else {
            const customer = customers?.QueryResponse?.Customer?.[0];
            resolve(customer || null);
          }
        });
      });
    } catch (error) {
      logger.error("Error finding customer by email", {
        error: error.message,
        tenantId,
        email,
      });
      throw error;
    }
  }

  async findCustomerByName(tenantId, name) {
    try {
      const connection = await this.ensureValidConnection(tenantId);

      const qbo = this.getQboClient(
        tenantId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      return new Promise((resolve, reject) => {
        // Try exact DisplayName match first
        qbo.findCustomers({ DisplayName: name }, (err, customers) => {
          if (err) {
            logger.error("Failed to find customer by name", {
              error: err.message,
              tenantId,
              name,
            });
            return reject(err);
          }
          const list = customers?.QueryResponse?.Customer || [];
          if (!list.length) return resolve(null);
          // Prefer exact case-insensitive match on DisplayName
          const exact = list.find((c) =>
            String(c.DisplayName || "").toLowerCase() === String(name).toLowerCase()
          );
          resolve(exact || list[0] || null);
        });
      });
    } catch (error) {
      logger.error("Error finding customer by name", {
        error: error.message,
        tenantId,
        name,
      });
      throw error;
    }
  }

  async getInvoice(tenantId, qboId) {
    try {
      const connection = await this.ensureValidConnection(tenantId);

      const qbo = this.getQboClient(
        tenantId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      return new Promise((resolve, reject) => {
        qbo.getInvoice(qboId, (err, invoice) => {
          if (err) {
            logger.error("Failed to get invoice from QuickBooks", {
              error: err.message,
              tenantId,
              qboId,
            });
            reject(err);
          } else {
            logger.info("Invoice retrieved from QuickBooks", {
              qboId,
              tenantId,
            });
            resolve(invoice);
          }
        });
      });
    } catch (error) {
      logger.error("Error getting invoice from QuickBooks", {
        error: error.message,
        tenantId,
        qboId,
      });
      throw error;
    }
  }

  async getItem(tenantId, qboId) {
    throw new NotImplementedError("getItem not implemented yet");
  }

  async findItemByName(tenantId, name) {
    try {
      const connection = await this.ensureValidConnection(tenantId);

      const qbo = this.getQboClient(
        tenantId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      return await new Promise((resolve, reject) => {
        qbo.findItems({ Name: name }, (err, result) => {
          if (err) return reject(err);
          const item = result?.QueryResponse?.Item?.[0];
          resolve(item || null);
        });
      });
    } catch (error) {
      logger.error("Error finding item by name in QuickBooks", {
        error: error.message,
        tenantId,
        name,
      });
      return null;
    }
  }

  async listCustomers(tenantId, filters = {}) {
    throw new NotImplementedError("listCustomers not implemented yet");
  }

  async listInvoices(tenantId, filters = {}) {
    throw new NotImplementedError("listInvoices not implemented yet");
  }

  async listItems(tenantId, filters = {}) {
    throw new NotImplementedError("listItems not implemented yet");
  }

  async syncCustomersFromQbo(tenantId, dal, options = {}) {
    try {
      logger.info("=== STARTING CUSTOMER SYNC FROM QUICKBOOKS ===", { 
        tenantId,
        force: options.force,
        startDate: options.startDate,
        endDate: options.endDate,
        allOptions: options
      });
      
      const connection = await this.ensureValidConnection(tenantId);
      // Also check extended connection table for delta checkpoints
      const ConnTable = require("../models/QuickBooksConnectionTable");
      const ext = await ConnTable.findActiveByUserId(tenantId);

      const qbo = this.getQboClient(
        tenantId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      // Test the connection first with timeout - but allow skipping for debugging
      const skipConnectionTest = process.env.QBO_SKIP_CONNECTION_TEST === "true";
      
      if (!skipConnectionTest) {
        logger.info("Testing QuickBooks connection before customer sync");
        const connectionTestTimeout = process.env.QBO_CONNECTION_TEST_TIMEOUT || 15000; // Default 15 seconds
        try {
          await this.withTimeout(new Promise((resolve, reject) => {
            qbo.getCompanyInfo((err, companyInfo) => {
              if (err) {
                logger.error("QuickBooks connection test failed", { 
                  error: err.message,
                  errorCode: err.code,
                  statusCode: err.statusCode,
                  fault: err.Fault
                });
                reject(new Error(`QuickBooks connection failed: ${formatQboError(err)}`));
              } else {
                logger.info("QuickBooks connection test successful", { 
                  companyName: companyInfo?.CompanyName || companyInfo?.Name 
                });
                resolve(companyInfo);
              }
            });
          }), connectionTestTimeout, "QuickBooks connection test");
        } catch (connectionError) {
          logger.error("QuickBooks connection test timed out or failed", {
            error: connectionError.message,
            timeout: connectionTestTimeout,
            suggestion: "This may indicate SSL/TLS or network connectivity issues"
          });
          
          // Try with a more lenient SSL configuration as fallback
          if (connectionError.message && (connectionError.message.includes("timeout") || connectionError.message.includes("SSL"))) {
            logger.info("Attempting connection with fallback SSL configuration");
            try {
              // Create a new QBO client with more lenient SSL settings
              const fallbackQbo = new QuickBooks(
                config.quickbooks.clientId,
                config.quickbooks.clientSecret,
                connection.accessToken,
                false,
                connection.realmId,
                config.quickbooks.environment === "production" ? false : true,
                false,
                null,
                "2.0",
                connection.refreshToken
              );
              
              // Override request with minimal SSL verification
              if (fallbackQbo.request) {
                const originalRequest = fallbackQbo.request;
                fallbackQbo.request = function(options, callback) {
                  if (typeof options === 'string') {
                    options = { uri: options };
                  }
                  options.strictSSL = false;
                  options.rejectUnauthorized = false;
                  options.timeout = 30000;
                  return originalRequest.call(this, options, callback);
                };
              }
              
              // Test fallback connection
              await this.withTimeout(new Promise((resolve, reject) => {
                fallbackQbo.getCompanyInfo((err, companyInfo) => {
                  if (err) {
                    reject(new Error(`Fallback connection also failed: ${formatQboError(err)}`));
                  } else {
                    logger.info("Fallback connection successful", { 
                      companyName: companyInfo?.CompanyName || companyInfo?.Name 
                    });
                    // Use the fallback client for the rest of the sync
                    qbo = fallbackQbo;
                    resolve(companyInfo);
                  }
                });
              }), connectionTestTimeout, "QuickBooks fallback connection test");
              
            } catch (fallbackError) {
              logger.error("Both primary and fallback connections failed", {
                primaryError: connectionError.message,
                fallbackError: fallbackError.message
              });
              
              // As a last resort, skip connection test and try direct sync
              logger.info("Connection tests failed, attempting direct customer sync without test");
            }
          } else {
            // Skip connection test and try direct sync
            logger.info("Connection test failed, attempting direct customer sync without test");
          }
        }
      } else {
        logger.info("Skipping connection test (QBO_SKIP_CONNECTION_TEST=true)");
      }

      let offset = 0;
      const limit = 100;
      let fetched = 0;
      let created = 0;
      let updated = 0;
      const errors = [];

      // Helper to map QBO customer to local shape (address stored as a single string)
      const mapQboCustomer = (c) => {
        const email = c.PrimaryEmailAddr?.Address || undefined;
        const phone = c.PrimaryPhone?.FreeFormNumber || undefined;
        const addr = c.BillAddr || {};
        // QBO Taxable=true means NOT tax exempt
        const taxExempt = c.Taxable === false ? true : false;
        // SalesTermRef.Name could be Net 15/Net 30 etc
        const salesTermName = c.SalesTermRef?.name || c.SalesTermRef?.Name;
        const termMap = {
          Net15: "net15",
          Net30: "net30",
          Net60: "net60",
          "Net 15": "net15",
          "Net 30": "net30",
          "Net 60": "net60",
        };
        const paymentTerms = termMap[salesTermName] || "immediate";
        const addressString = [
          addr.Line1 || undefined,
          addr.City || undefined,
          addr.CountrySubDivisionCode || undefined,
          addr.PostalCode || undefined,
          addr.Country || undefined,
        ]
          .filter(Boolean)
          .join(", ");
        return {
          name: c.DisplayName || [c.GivenName, c.FamilyName].filter(Boolean).join(" ") || "Unnamed Customer",
          email,
          phone,
          address: addressString,
          isActive: c.Active !== false,
          balance: typeof c.Balance === "number" ? c.Balance : 0,
          taxExempt,
          paymentTerms,
          qboId: c.Id,
          qboSyncStatus: "synced",
          qboLastSync: new Date(),
        };
      };

      // Paginate through QBO customers using node-quickbooks findCustomers
      while (true) {
        /* eslint no-await-in-loop: 0 */
        logger.info(`Fetching customers batch`, { offset, limit, startDate: options.startDate, endDate: options.endDate });
        
        let list;
        try {
          list = await this.withTimeout(new Promise((resolve, reject) => {
            // If we have a lastCustomerPullAt checkpoint, use it to filter by MetaData.LastUpdatedTime where possible.
            // node-quickbooks findCustomers doesn't expose a filter for MetaData directly, so we will fetch pages and filter client-side.
            qbo.findCustomers({ limit, offset }, (err, result) => {
              if (err) {
                // Provide clearer messages for auth issues
                const msg =
                  err?.message?.includes("401") || err?.statusCode === 401
                    ? "QuickBooks access token is invalid or expired. Please reconnect."
                    : err?.message || "Failed to fetch customers from QuickBooks";
                return reject(new Error(msg));
              }
              let customers = result?.QueryResponse?.Customer || [];
              
              // Apply filtering based on sync conditions
              if (options.startDate || options.endDate) {
                const startDate = options.startDate ? new Date(options.startDate) : null;
                const endDate = options.endDate ? new Date(options.endDate) : null;
                // Set end date to end of day if provided
                if (endDate) {
                  endDate.setHours(23, 59, 59, 999);
                }
                
                if (options.force) {
                  // Case 2: Date range + force = ALL customers in that range
                  logger.info("Sync mode: Date range + Force - fetching ALL customers in range", {
                    startDate: options.startDate,
                    endDate: options.endDate,
                    force: options.force
                  });
                  customers = customers.filter((c) => {
                    const lastUpdated = c?.MetaData?.LastUpdatedTime ? new Date(c.MetaData.LastUpdatedTime) : null;
                    if (!lastUpdated) return false;
                    
                    if (startDate && lastUpdated < startDate) return false;
                    if (endDate && lastUpdated > endDate) return false;
                    return true;
                  });
                } else {
                  // Case 1: Date range only = only NEW/UPDATED customers in that range
                  logger.info("Sync mode: Date range only - fetching NEW/UPDATED customers in range", {
                    startDate: options.startDate,
                    endDate: options.endDate,
                    lastPullAt: ext?.lastCustomerPullAt,
                    lastPushAt: ext?.lastCustomerPushAt
                  });
                  
                  // Smart checkpoint: use the later of pull or push timestamp to avoid re-syncing
                  // If we just pushed to QB, don't immediately import the same records back
                  let effectiveCheckpoint = null;
                  if (ext?.lastCustomerPullAt && ext?.lastCustomerPushAt) {
                    effectiveCheckpoint = new Date(Math.max(
                      new Date(ext.lastCustomerPullAt).getTime(),
                      new Date(ext.lastCustomerPushAt).getTime()
                    ));
                    logger.info("Using smart checkpoint (max of pull/push)", {
                      lastPull: ext.lastCustomerPullAt,
                      lastPush: ext.lastCustomerPushAt,
                      effectiveCheckpoint: effectiveCheckpoint.toISOString()
                    });
                  } else if (ext?.lastCustomerPullAt) {
                    effectiveCheckpoint = new Date(ext.lastCustomerPullAt);
                  } else if (ext?.lastCustomerPushAt) {
                    effectiveCheckpoint = new Date(ext.lastCustomerPushAt);
                  }
                  
                  customers = customers.filter((c) => {
                    const lastUpdated = c?.MetaData?.LastUpdatedTime ? new Date(c.MetaData.LastUpdatedTime) : null;
                    const createTime = c?.MetaData?.CreateTime ? new Date(c.MetaData.CreateTime) : null;
                    if (!lastUpdated && !createTime) return false;
                    
                    // Must be in date range
                    const checkDate = lastUpdated || createTime;
                    if (startDate && checkDate < startDate) return false;
                    if (endDate && checkDate > endDate) return false;
                    
                    // Must be newer than our smart checkpoint
                    if (effectiveCheckpoint) {
                      return checkDate > effectiveCheckpoint;
                    }
                    
                    return true;
                  });
                }
              } else if (options.force) {
                // Case 3: Force only = ALL customers (no filtering at all!)
                logger.info("Sync mode: Force only - fetching ALL customers (ignoring checkpoints)", {
                  force: options.force,
                  beforeFilterCount: customers.length
                });
                // No filtering - keep all customers - force means FORCE!
                // Don't apply any checkpoint filtering when force is true
              } else {
                // Case 4: No date range, no force = only NEW/UPDATED customers since last sync
                logger.info("Sync mode: Default - fetching NEW/UPDATED customers since last sync", {
                  lastPullAt: ext?.lastCustomerPullAt,
                  lastPushAt: ext?.lastCustomerPushAt
                });
                
                // Smart checkpoint: use the later of pull or push timestamp
                let effectiveCheckpoint = null;
                if (ext?.lastCustomerPullAt && ext?.lastCustomerPushAt) {
                  effectiveCheckpoint = new Date(Math.max(
                    new Date(ext.lastCustomerPullAt).getTime(),
                    new Date(ext.lastCustomerPushAt).getTime()
                  ));
                  logger.info("Using smart checkpoint for default sync", {
                    lastPull: ext.lastCustomerPullAt,
                    lastPush: ext.lastCustomerPushAt,
                    effectiveCheckpoint: effectiveCheckpoint.toISOString()
                  });
                } else if (ext?.lastCustomerPullAt) {
                  effectiveCheckpoint = new Date(ext.lastCustomerPullAt);
                } else if (ext?.lastCustomerPushAt) {
                  effectiveCheckpoint = new Date(ext.lastCustomerPushAt);
                }
                
                if (effectiveCheckpoint) {
                  customers = customers.filter((c) => {
                    const lu = c?.MetaData?.LastUpdatedTime || c?.MetaData?.CreateTime;
                    return lu ? new Date(lu) > effectiveCheckpoint : true;
                  });
                }
              }
              
              // Log filtering results
              logger.info("=== CUSTOMER FILTERING COMPLETE ===", {
                totalFromQB: result?.QueryResponse?.Customer?.length || 0,
                afterFiltering: customers.length,
                filtered: (result?.QueryResponse?.Customer?.length || 0) - customers.length,
                force: options.force,
                hasDateRange: !!(options.startDate || options.endDate)
              });
              
              resolve(customers);
            });
          }), 45000, `QuickBooks findCustomers (offset: ${offset})`);
        } catch (fetchError) {
          logger.error("Customer fetch failed, trying with fallback client", {
            error: fetchError.message,
            offset
          });
          
          // Try with fallback client if not already using it
          if (!qbo._isFallback) {
            logger.info("Creating fallback client for customer fetch");
            const fallbackQbo = new QuickBooks(
              config.quickbooks.clientId,
              config.quickbooks.clientSecret,
              connection.accessToken,
              false,
              connection.realmId,
              config.quickbooks.environment === "production" ? false : true,
              false,
              null,
              "2.0",
              connection.refreshToken
            );
            fallbackQbo._isFallback = true;
            
            // Override request with minimal SSL verification
            if (fallbackQbo.request) {
              const originalRequest = fallbackQbo.request;
              fallbackQbo.request = function(options, callback) {
                if (typeof options === 'string') {
                  options = { uri: options };
                }
                options.strictSSL = false;
                options.rejectUnauthorized = false;
                options.timeout = 45000;
                return originalRequest.call(this, options, callback);
              };
            }
            
            // Try with fallback client
            list = await this.withTimeout(new Promise((resolve, reject) => {
              fallbackQbo.findCustomers({ limit, offset }, (err, result) => {
                if (err) {
                  const msg = err?.message || "Failed to fetch customers from QuickBooks (fallback)";
                  return reject(new Error(msg));
                }
                let customers = result?.QueryResponse?.Customer || [];
                
                // Apply date range filtering if provided (unless force is enabled without date range)
                if (options.startDate || options.endDate) {
                  const startDate = options.startDate ? new Date(options.startDate) : null;
                  const endDate = options.endDate ? new Date(options.endDate) : null;
                  // Set end date to end of day if provided
                  if (endDate) {
                    endDate.setHours(23, 59, 59, 999);
                  }
                  
                  customers = customers.filter((c) => {
                    const lastUpdated = c?.MetaData?.LastUpdatedTime ? new Date(c.MetaData.LastUpdatedTime) : null;
                    if (!lastUpdated) return false; // Skip customers without LastUpdatedTime
                    
                    if (startDate && lastUpdated < startDate) return false;
                    if (endDate && lastUpdated > endDate) return false;
                    return true;
                  });
                } else if (!options.force && (ext?.lastCustomerPullAt || ext?.lastCustomerPushAt)) {
                  // Fall back to smart checkpoint logic if no date range provided AND force is NOT enabled
                  // Force means ignore all checkpoints!
                  const lastPullAt = ext?.lastCustomerPullAt ? new Date(ext.lastCustomerPullAt) : null;
                  const lastPushAt = ext?.lastCustomerPushAt ? new Date(ext.lastCustomerPushAt) : null;
                  const effectiveCheckpoint = lastPullAt && lastPushAt 
                    ? new Date(Math.max(lastPullAt.getTime(), lastPushAt.getTime()))
                    : lastPullAt || lastPushAt;
                  
                  customers = customers.filter((c) => {
                    const lu = c?.MetaData?.LastUpdatedTime || c?.MetaData?.CreateTime;
                    return lu ? new Date(lu) > effectiveCheckpoint : true;
                  });
                } else if (options.force) {
                  // Force enabled - keep all customers from fallback fetch
                  logger.info("Fallback: Force enabled - keeping all customers", {
                    count: customers.length
                  });
                }
                resolve(customers);
              });
            }), 45000, `QuickBooks findCustomers fallback (offset: ${offset})`);
            
            qbo = fallbackQbo; // Use fallback for subsequent requests
            logger.info("Successfully switched to fallback client");
          } else {
            // Already using fallback, this is a real failure
            throw fetchError;
          }
        }

        if (!list || list.length === 0) break;

        for (const c of list) {
          try {
            const data = mapQboCustomer(c);
            let existing = await Customer.findOne({ qboId: data.qboId });
            if (!existing && data.email) {
              existing = await Customer.findOne({ email: data.email.toLowerCase() });
            }
            if (!existing && data.name) {
              // Case-insensitive exact name match fallback
              existing = await Customer.findOne({
                name: { $regex: `^${String(data.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
              });
            }

            if (existing) {
              await Customer.findByIdAndUpdate(existing._id, data, {
                new: true,
                runValidators: true,
              });
              updated++;
            } else {
              const createdDoc = new Customer(data);
              await createdDoc.save();
              created++;
            }
            fetched++;
          } catch (e) {
            logger.error("Customer processing error", { customerId: c.Id, error: e.message });
            errors.push({ id: c.Id, message: e.message });
          }
        }

        logger.info(`Processed customer batch`, { 
          offset, 
          batchSize: list.length, 
          totalFetched: fetched, 
          totalCreated: created, 
          totalUpdated: updated 
        });
        offset += limit;
      }

      // If date ranges are specified without force, and we got no results, that's expected - don't run fallback
      if (fetched === 0 && (created === 0 && updated === 0) && (options.startDate || options.endDate) && !options.force) {
        logger.info("No new/updated customers found in specified date range - skipping fallback", {
          startDate: options.startDate,
          endDate: options.endDate,
          force: options.force,
          reason: "date range without force returned no new/updated results"
        });
      }

      // Fallback: if delta checkpoint produced zero results, run a full import once
      // But skip fallback if specific date ranges are provided without force (user wants only new/updated in that range)
      // Also skip fallback if using smart checkpoint (pull+push logic) - zero results is expected behavior
      const usingSmartCheckpoint = ext?.lastCustomerPullAt && ext?.lastCustomerPushAt;
      if (fetched === 0 && (created === 0 && updated === 0) && ext?.lastCustomerPullAt && !options.startDate && !options.endDate && !options.force && !usingSmartCheckpoint) {
        logger.info("Running fallback full customer import", { 
          reason: "delta sync returned no results and no date range specified (single checkpoint only)"
        });
        offset = 0;
        const seen = new Set();
        while (true) {
          /* eslint no-await-in-loop: 0 */
          logger.info(`Fetching customers batch (fallback)`, { offset, limit });
          const list = await this.withTimeout(new Promise((resolve, reject) => {
            qbo.findCustomers({ limit, offset }, (err, result) => {
              if (err) {
                const msg =
                  err?.message?.includes("401") || err?.statusCode === 401
                    ? "QuickBooks access token is invalid or expired. Please reconnect."
                    : err?.message || "Failed to fetch customers from QuickBooks";
                return reject(new Error(msg));
              }
              resolve(result?.QueryResponse?.Customer || []);
            });
          }), 45000, `QuickBooks findCustomers fallback (offset: ${offset})`);
          if (!list || list.length === 0) break;
          for (const c of list) {
            try {
              if (seen.has(c.Id)) continue;
              seen.add(c.Id);
              const data = mapQboCustomer(c);
              let existing = await Customer.findOne({ qboId: data.qboId });
              if (!existing && data.email) {
                existing = await Customer.findOne({ email: data.email.toLowerCase() });
              }
              if (!existing && data.name) {
                existing = await Customer.findOne({
                  name: { $regex: `^${String(data.name).replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}$`, $options: "i" },
                });
              }

              if (existing) {
                await Customer.findByIdAndUpdate(existing._id, data, { new: true, runValidators: true });
                updated++;
              } else {
                const createdDoc = new Customer(data);
                await createdDoc.save();
                created++;
              }
              fetched++;
            } catch (e) {
              errors.push({ id: c.Id, message: e.message });
            }
          }
          offset += limit;
        }
      } else if (usingSmartCheckpoint && fetched === 0 && (created === 0 && updated === 0)) {
        logger.info("Smart checkpoint prevented unnecessary customer import", {
          lastPullAt: ext?.lastCustomerPullAt,
          lastPushAt: ext?.lastCustomerPushAt,
          reason: "no records newer than effective checkpoint (max of pull/push timestamps)"
        });
      }

      // Update last sync checkpoints
      const now = new Date();
      await QuickBooksConnection.findOneAndUpdate(
        { userId: tenantId },
        { lastSyncAt: now }
      );
      // Only advance checkpoint if something was fetched/changed
      if (fetched > 0 || created > 0 || updated > 0) {
        await ConnTable.findOneAndUpdate(
          { userId: tenantId },
          { lastSyncAt: now, lastCustomerPullAt: now },
          { upsert: false }
        );
      }

      logger.info("Customer import from QBO completed", {
        tenantId,
        fetched,
        created,
        updated,
        errors: errors.length,
      });
      // History: mark success if no errors, partial otherwise
      const status = errors.length === 0 ? "success" : "partial";
      // Use number of changes as recordsCount for visibility
      await this.recordSyncHistory(tenantId, "customers", status, created + updated, errors[0]?.message || null);

      return { success: true, fetched, created, updated, errors };
    } catch (error) {
      logger.error("Error syncing customers from QBO", {
        error: error.message,
        stack: error.stack,
        tenantId,
      });
      
      // Provide specific error messages for common issues
      let errorMessage = error.message;
      if (error.message?.includes("401") || error.message?.includes("token")) {
        errorMessage = "QuickBooks authentication failed. Please reconnect your QuickBooks account.";
      } else if (error.message?.includes("SSL") || error.message?.includes("ECONNRESET")) {
        errorMessage = "Connection error with QuickBooks. Please try again.";
      }
      
      // History: failed import
      try { 
        await this.recordSyncHistory(tenantId, "customers", "failed", 0, errorMessage); 
      } catch (historyError) {
        logger.warn("Failed to record sync history", { error: historyError.message });
      }
      
      throw new Error(errorMessage);
    }
  }

  async syncInvoicesFromQbo(tenantId, dal, options = {}) {
    console.log("=== STARTING INVOICE SYNC ===");
    console.log("Tenant ID:", tenantId);
    console.log("Options:", options);
    console.log("Timestamp:", new Date().toISOString());
    
    try {
      logger.info("Starting invoice sync from QuickBooks", { 
        tenantId,
        startDate: options.startDate,
        endDate: options.endDate
      });
      
      const connection = await this.ensureValidConnection(tenantId);
      const ConnTable = require("../models/QuickBooksConnectionTable");
      const ext = await ConnTable.findActiveByUserId(tenantId);

      const qbo = this.getQboClient(
        tenantId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      // Test the connection first with timeout - but allow skipping for debugging
      const skipConnectionTest = process.env.QBO_SKIP_CONNECTION_TEST === "true" || process.env.QBO_SKIP_INVOICE_CONNECTION_TEST === "true";
      
      if (!skipConnectionTest) {
        logger.info("Testing QuickBooks connection before invoice sync");
        const connectionTestTimeout = process.env.QBO_CONNECTION_TEST_TIMEOUT || 10000; // Shorter timeout for invoices
        try {
          await this.withTimeout(new Promise((resolve, reject) => {
            qbo.getCompanyInfo((err, companyInfo) => {
              if (err) {
                logger.error("QuickBooks connection test failed", { 
                  error: err.message,
                  errorCode: err.code,
                  statusCode: err.statusCode,
                  fault: err.Fault
                });
                reject(new Error(`QuickBooks connection failed: ${formatQboError(err)}`));
              } else {
                logger.info("QuickBooks connection test successful", { 
                  companyName: companyInfo?.CompanyName || companyInfo?.Name 
                });
                resolve(companyInfo);
              }
            });
          }), connectionTestTimeout, "QuickBooks connection test");
        } catch (connectionError) {
          logger.error("QuickBooks connection test timed out or failed", {
            error: connectionError.message,
            timeout: connectionTestTimeout,
            suggestion: "This may indicate SSL/TLS or network connectivity issues"
          });
          
          // Skip connection test and try direct sync
          logger.info("Connection test failed, attempting direct invoice sync without test");
        }
      } else {
        logger.info("Skipping connection test for invoices (QBO_SKIP_CONNECTION_TEST=true or QBO_SKIP_INVOICE_CONNECTION_TEST=true)");
      }

      const InvoiceModel = require("../models/Invoice");
      const CustomerModel = require("../models/Customer");

      let offset = 0;
      const limit = 100;
      let fetched = 0;
      let created = 0;
      let updated = 0;
      const errors = [];
      const startTime = Date.now();

      logger.info("Starting invoice sync with progress tracking", { 
        tenantId, 
        batchSize: limit,
        startTime: new Date(startTime).toISOString()
      });

      // Helper: map QBO Invoice to local shape
      const mapQboInvoice = (inv) => {
        const lines = Array.isArray(inv.Line) ? inv.Line : [];
        const items = lines
          .filter((ln) => ln.DetailType === "SalesItemLineDetail")
          .map((ln) => {
            const det = ln.SalesItemLineDetail || {};
            const qty = Number(det.Qty) || Number(ln.Qty) || 0;
            const rate = Number(det.UnitPrice) || Number(ln.Rate) || 0;
            const disc = Number(det?.DiscountAmt) || 0;
            const taxRateFrac = (() => {
              const pct = Number(det?.TaxRateRef?.value || det?.TaxRateRef?.Value || 0);
              return isNaN(pct) ? 0 : pct / 100;
            })();
            const name = det?.ItemRef?.name || det?.ItemRef?.Name || ln?.Description || "Item";
            const sku = det?.ItemRef?.value || det?.ItemRef?.Value || "";
            const lineTotal = Number(ln.Amount) || Math.max(0, qty * rate - disc);
            return {
              productName: name,
              sku,
              quantity: qty || 1,
              unitPrice: rate,
              discount: disc,
              taxRate: taxRateFrac,
              lineTotal,
            };
          });

        const customerRef = inv.CustomerRef || {};
        const dueDate = inv.DueDate ? new Date(inv.DueDate) : undefined;
        const issueDate = inv.TxnDate ? new Date(inv.TxnDate) : new Date();
        const total = Number(inv.TotalAmt) || items.reduce((s, i) => s + i.lineTotal, 0);
        const amountPaid = Number(inv?.LinkedTxn?.filter((t) => t.TxnType === "Payment").reduce((s, t) => s + (Number(t.Amount) || 0), 0)) || 0;
        const balance = Number(inv.Balance) ?? Math.max(0, total - amountPaid);

        return {
          invoiceNumber: inv.DocNumber ? parseInt(inv.DocNumber) : inv.Id,
          items,
          subtotal: Number(inv?.TxnTaxDetail?.TotalTax) ? total - Number(inv?.TxnTaxDetail?.TotalTax) : Math.max(0, items.reduce((s, i) => s + (i.unitPrice * i.quantity - (i.discount || 0)), 0)),
          taxAmount: Number(inv?.TxnTaxDetail?.TotalTax) || 0,
          total,
          amountPaid,
          balance,
          status: balance <= 0 ? "paid" : "sent",
          dueDate,
          issueDate,
          paymentTerms: "immediate",
          notes: inv.PrivateNote,
          poNumber: inv.PONumber || undefined, // Pull PO Number from QuickBooks
          qboId: inv.Id,
          qboSyncStatus: "synced",
          qboLastSync: new Date(),
        };
      };

      while (true) {
        /* eslint no-await-in-loop: 0 */
        logger.info(`Fetching invoices batch`, { 
          offset, 
          limit,
          totalProcessedSoFar: fetched,
          elapsedTimeMs: Date.now() - startTime,
          elapsedTimeFormatted: `${Math.round((Date.now() - startTime) / 1000)}s`
        });
        
        let page;
        try {
          page = await this.withTimeout(new Promise((resolve, reject) => {
            qbo.findInvoices({ limit, offset }, (err, result) => {
              if (err) {
                const msg =
                  err?.message?.includes("401") || err?.statusCode === 401
                    ? "QuickBooks access token is invalid or expired. Please reconnect."
                    : err?.message || "Failed to fetch invoices from QuickBooks";
                return reject(new Error(msg));
              }
              let list = result?.QueryResponse?.Invoice || [];
              
              // Apply filtering based on sync conditions
              if (options.startDate || options.endDate) {
                const startDate = options.startDate ? new Date(options.startDate) : null;
                const endDate = options.endDate ? new Date(options.endDate) : null;
                // Set end date to end of day if provided
                if (endDate) {
                  endDate.setHours(23, 59, 59, 999);
                }
                
                if (options.force) {
                  // Case 2: Date range + force = ALL invoices in that range
                  logger.info("Invoice sync mode: Date range + Force - fetching ALL invoices in range", {
                    startDate: options.startDate,
                    endDate: options.endDate,
                    force: options.force
                  });
                  list = list.filter((i) => {
                    // Use TxnDate (transaction date) for invoices
                    const txnDate = i?.TxnDate ? new Date(i.TxnDate) : null;
                    if (!txnDate) return false;
                    
                    if (startDate && txnDate < startDate) return false;
                    if (endDate && txnDate > endDate) return false;
                    return true;
                  });
                } else {
                  // Case 1: Date range only = only NEW/UPDATED invoices in that range
                  logger.info("Invoice sync mode: Date range only - fetching NEW/UPDATED invoices in range", {
                    startDate: options.startDate,
                    endDate: options.endDate,
                    lastPullAt: ext?.lastInvoicePullAt
                  });
                  const lastPull = ext?.lastInvoicePullAt ? new Date(ext.lastInvoicePullAt) : null;
                  
                  list = list.filter((i) => {
                    const txnDate = i?.TxnDate ? new Date(i.TxnDate) : null;
                    const lastUpdated = i?.MetaData?.LastUpdatedTime ? new Date(i.MetaData.LastUpdatedTime) : null;
                    const createTime = i?.MetaData?.CreateTime ? new Date(i.MetaData.CreateTime) : null;
                    
                    if (!txnDate) return false;
                    
                    // Must be in date range (by transaction date)
                    if (startDate && txnDate < startDate) return false;
                    if (endDate && txnDate > endDate) return false;
                    
                    // Must be new or updated since last pull (if we have a checkpoint)
                    if (lastPull) {
                      const checkDate = lastUpdated || createTime || txnDate;
                      return checkDate > lastPull;
                    }
                    
                    return true;
                  });
                }
              } else if (options.force) {
                // Case 3: Force only = ALL invoices
                logger.info("Invoice sync mode: Force only - fetching ALL invoices", {
                  force: options.force
                });
                // No filtering - keep all invoices
              } else {
                // Case 4: No date range, no force = only NEW/UPDATED invoices since last sync
                // Use smart checkpoint: max of pull and push timestamps to avoid redundant syncing
                const lastPullAt = ext?.lastInvoicePullAt ? new Date(ext.lastInvoicePullAt) : null;
                const lastPushAt = ext?.lastInvoicePushAt ? new Date(ext.lastInvoicePushAt) : null;
                const effectiveCheckpoint = lastPullAt && lastPushAt 
                  ? new Date(Math.max(lastPullAt.getTime(), lastPushAt.getTime()))
                  : lastPullAt || lastPushAt;
                
                logger.info("Invoice sync mode: Default - fetching NEW/UPDATED invoices since last sync", {
                  lastPullAt: ext?.lastInvoicePullAt,
                  lastPushAt: ext?.lastInvoicePushAt,
                  effectiveCheckpoint: effectiveCheckpoint?.toISOString()
                });
                
                if (effectiveCheckpoint) {
                  list = list.filter((i) => {
                    const lu = i?.MetaData?.LastUpdatedTime || i?.MetaData?.CreateTime;
                    return lu ? new Date(lu) > effectiveCheckpoint : true;
                  });
                }
              }
              resolve(list);
            });
          }), 30000, `QuickBooks findInvoices (offset: ${offset})`); // Reduced from 45s to 30s
        } catch (fetchError) {
          logger.error("Invoice fetch failed, trying with fallback client", {
            error: fetchError.message,
            offset
          });
          
          // Try with fallback client if not already using it
          if (!qbo._isFallback) {
            logger.info("Creating fallback client for invoice fetch");
            const fallbackQbo = new QuickBooks(
              config.quickbooks.clientId,
              config.quickbooks.clientSecret,
              connection.accessToken,
              false,
              connection.realmId,
              config.quickbooks.environment === "production" ? false : true,
              false,
              null,
              "2.0",
              connection.refreshToken
            );
            fallbackQbo._isFallback = true;
            
            // Override request with minimal SSL verification
            if (fallbackQbo.request) {
              const originalRequest = fallbackQbo.request;
              fallbackQbo.request = function(options, callback) {
                if (typeof options === 'string') {
                  options = { uri: options };
                }
                options.strictSSL = false;
                options.rejectUnauthorized = false;
                options.timeout = 45000;
                return originalRequest.call(this, options, callback);
              };
            }
            
            // Try with fallback client
            page = await this.withTimeout(new Promise((resolve, reject) => {
              fallbackQbo.findInvoices({ limit, offset }, (err, result) => {
                if (err) {
                  const msg = err?.message || "Failed to fetch invoices from QuickBooks (fallback)";
                  return reject(new Error(msg));
                }
                let list = result?.QueryResponse?.Invoice || [];
                
                // Apply date range filtering if provided
                if (options.startDate || options.endDate) {
                  const startDate = options.startDate ? new Date(options.startDate) : null;
                  const endDate = options.endDate ? new Date(options.endDate) : null;
                  // Set end date to end of day if provided
                  if (endDate) {
                    endDate.setHours(23, 59, 59, 999);
                  }
                  
                  list = list.filter((i) => {
                    // Use TxnDate (transaction date) for invoices
                    const txnDate = i?.TxnDate ? new Date(i.TxnDate) : null;
                    if (!txnDate) return false; // Skip invoices without TxnDate
                    
                    if (startDate && txnDate < startDate) return false;
                    if (endDate && txnDate > endDate) return false;
                    return true;
                  });
                } else if (ext?.lastInvoicePullAt || ext?.lastInvoicePushAt) {
                  // Fall back to smart checkpoint logic if no date range provided
                  const lastPullAt = ext?.lastInvoicePullAt ? new Date(ext.lastInvoicePullAt) : null;
                  const lastPushAt = ext?.lastInvoicePushAt ? new Date(ext.lastInvoicePushAt) : null;
                  const effectiveCheckpoint = lastPullAt && lastPushAt 
                    ? new Date(Math.max(lastPullAt.getTime(), lastPushAt.getTime()))
                    : lastPullAt || lastPushAt;
                  
                  list = list.filter((i) => {
                    const lu = i?.MetaData?.LastUpdatedTime || i?.MetaData?.CreateTime;
                    return lu ? new Date(lu) > effectiveCheckpoint : true;
                  });
                }
                resolve(list);
              });
            }), 45000, `QuickBooks findInvoices fallback (offset: ${offset})`);
            
            qbo = fallbackQbo; // Use fallback for subsequent requests
            logger.info("Successfully switched to fallback client for invoices");
          } else {
            // Already using fallback, this is a real failure
            throw fetchError;
          }
        }

        if (!page || page.length === 0) break;

        for (const inv of page) {
          try {
            const data = mapQboInvoice(inv);
            // Try to link to local customer by qboId or email; if missing, backfill from QBO by CustomerRef
            let customer = null;
            const cRef = inv.CustomerRef?.value || inv.CustomerRef?.Value;
            if (cRef) {
              customer = await CustomerModel.findOne({ qboId: cRef });
              if (!customer) {
                // Fetch QBO customer and upsert locally to avoid null references in UI
                try {
                  const qboCustomer = await this.withTimeout(new Promise((resolve, reject) => {
                    qbo.getCustomer(cRef, (err, c) => (err ? reject(err) : resolve(c)));
                  }), 10000, `QuickBooks getCustomer (${cRef})`); // Reduced from 20s to 10s
                  if (qboCustomer) {
                      const addrC = qboCustomer.BillAddr || {};
                      const addressString = [
                        addrC.Line1 || undefined,
                        addrC.City || undefined,
                        addrC.CountrySubDivisionCode || undefined,
                        addrC.PostalCode || undefined,
                        addrC.Country || undefined,
                      ]
                        .filter(Boolean)
                        .join(", ");
                      const dataC = {
                      name:
                        qboCustomer.DisplayName ||
                        [qboCustomer.GivenName, qboCustomer.FamilyName]
                          .filter(Boolean)
                          .join(" ") ||
                        "Unnamed Customer",
                      email: qboCustomer.PrimaryEmailAddr?.Address?.toLowerCase(),
                      phone: qboCustomer.PrimaryPhone?.FreeFormNumber,
                        address: addressString,
                      isActive: qboCustomer.Active !== false,
                      qboId: String(qboCustomer.Id),
                      qboSyncStatus: "synced",
                      qboLastSync: new Date(),
                    };
                    // Match by qboId -> email -> name
                    let existingC = await CustomerModel.findOne({ qboId: dataC.qboId });
                    if (!existingC && dataC.email) {
                      existingC = await CustomerModel.findOne({ email: dataC.email });
                    }
                    if (!existingC) {
                      existingC = await CustomerModel.findOne({
                        name: {
                          $regex: `^${String(dataC.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                          $options: "i",
                        },
                      });
                    }
                    if (existingC) {
                      await CustomerModel.findByIdAndUpdate(existingC._id, dataC, {
                        new: true,
                        runValidators: true,
                      });
                      customer = existingC;
                    } else {
                      const createdC = new CustomerModel(dataC);
                      await createdC.save();
                      customer = createdC;
                    }
                  }
                } catch (eFetch) {
                  console.error("=== CUSTOMER FETCH ERROR DURING INVOICE SYNC ===");
                  console.error("Customer Ref:", cRef);
                  console.error("Invoice ID:", inv.Id);
                  console.error("Error Message:", eFetch.message || eFetch.toString() || 'Unknown error');
                  console.error("Error Stack:", eFetch.stack || 'No stack trace available');
                  console.error("Error Object:", JSON.stringify(eFetch, null, 2));
                  console.error("Is Timeout:", eFetch.message && eFetch.message.includes('timeout'));
                  console.error("=== END CUSTOMER FETCH ERROR ===");
                  
                  logger.warn("Failed to backfill customer during invoice import", {
                    error: eFetch.message || eFetch.toString() || 'Unknown error',
                    stack: eFetch.stack || 'No stack trace available',
                    tenantId,
                    cRef,
                    invoiceId: inv.Id,
                    timeout: eFetch.message && eFetch.message.includes('timeout'),
                    willContinueWithoutCustomer: true
                  });
                  // Continue without customer instead of failing the entire invoice
                  customer = null;
                }
              }
            }
            if (!customer && inv.BillEmail?.Address) {
              customer = await CustomerModel.findOne({ email: inv.BillEmail.Address.toLowerCase() });
            }

            const existing = await InvoiceModel.findOne({ qboId: inv.Id });
            if (existing) {
              await InvoiceModel.findByIdAndUpdate(existing._id, {
                ...data,
                customerId: customer ? customer._id : existing.customerId,
              }, { new: true, runValidators: true });
              updated++;
            } else {
              try {
                const doc = new InvoiceModel({
                  ...data,
                  customerId: customer ? customer._id : undefined,
                });
                await doc.save();
                created++;
              } catch (e) {
                // If local invoice with same invoiceNumber exists, update it and attach qboId
                if (e?.code === 11000 && e?.keyPattern && e.keyPattern.invoiceNumber) {
                  const existingByNumber = await InvoiceModel.findOne({ invoiceNumber: data.invoiceNumber });
                  if (existingByNumber) {
                    await InvoiceModel.findByIdAndUpdate(existingByNumber._id, {
                      ...data,
                      customerId: customer ? customer._id : existingByNumber.customerId,
                    }, { new: true, runValidators: true });
                    updated++;
                  } else {
                    throw e;
                  }
                } else {
                  throw e;
                }
              }
            }
            fetched++;
          } catch (e) {
            console.error("=== DETAILED INVOICE PROCESSING ERROR ===");
            console.error("Invoice ID:", inv.Id);
            console.error("Invoice Number:", inv.DocNumber);
            console.error("Error Message:", e.message);
            console.error("Error Stack:", e.stack);
            console.error("Customer Ref:", inv.CustomerRef?.value || inv.CustomerRef?.Value);
            console.error("=== END INVOICE ERROR ===");
            
            logger.error("Invoice processing error", { 
              invoiceId: inv.Id, 
              invoiceNumber: inv.DocNumber,
              error: e.message,
              stack: e.stack,
              customerRef: inv.CustomerRef?.value || inv.CustomerRef?.Value,
              fullInvoiceData: JSON.stringify(inv, null, 2).substring(0, 1000) // First 1000 chars of invoice data
            });
            errors.push({ id: inv.Id, message: e.message });
          }
        }

        logger.info(`Processed invoice batch`, { 
          offset, 
          batchSize: page.length, 
          totalFetched: fetched, 
          totalCreated: created, 
          totalUpdated: updated,
          elapsedTimeMs: Date.now() - startTime,
          elapsedTimeFormatted: `${Math.round((Date.now() - startTime) / 1000)}s`,
          currentBatchEmpty: page.length === 0
        });
        offset += limit;
      }

      // Fallback: if delta checkpoint produced zero results, run a full import once
      // Skip fallback if using smart checkpoint (pull+push logic) - zero results is expected behavior
      const usingSmartCheckpoint = ext?.lastInvoicePullAt && ext?.lastInvoicePushAt;
      if (fetched === 0 && (created === 0 && updated === 0) && ext?.lastInvoicePullAt && !usingSmartCheckpoint) {
        logger.info("Running fallback full invoice import", { 
          reason: "delta sync returned no results (single checkpoint only)" 
        });
        offset = 0;
        const seen = new Set();
        while (true) {
          /* eslint no-await-in-loop: 0 */
          logger.info(`Fetching invoices batch (fallback)`, { offset, limit });
          const page = await this.withTimeout(new Promise((resolve, reject) => {
            qbo.findInvoices({ limit, offset }, (err, result) => {
              if (err) {
                const msg =
                  err?.message?.includes("401") || err?.statusCode === 401
                    ? "QuickBooks access token is invalid or expired. Please reconnect."
                    : err?.message || "Failed to fetch invoices from QuickBooks";
                return reject(new Error(msg));
              }
              resolve(result?.QueryResponse?.Invoice || []);
            });
          }), 45000, `QuickBooks findInvoices fallback (offset: ${offset})`);
          if (!page || page.length === 0) break;
          for (const inv of page) {
            try {
              if (seen.has(inv.Id)) continue;
              seen.add(inv.Id);
              const data = mapQboInvoice(inv);
              let customer = null;
              const cRef = inv.CustomerRef?.value || inv.CustomerRef?.Value;
              if (cRef) {
                customer = await CustomerModel.findOne({ qboId: cRef });
              }
              if (!customer && inv.BillEmail?.Address) {
                customer = await CustomerModel.findOne({ email: inv.BillEmail.Address.toLowerCase() });
              }
              const existing = await InvoiceModel.findOne({ qboId: inv.Id });
              if (existing) {
                await InvoiceModel.findByIdAndUpdate(existing._id, { ...data, customerId: customer ? customer._id : existing.customerId }, { new: true, runValidators: true });
                updated++;
              } else {
                try {
                  const doc = new InvoiceModel({ ...data, customerId: customer ? customer._id : undefined });
                  await doc.save();
                  created++;
                } catch (e) {
                  if (e?.code === 11000 && e?.keyPattern && e.keyPattern.invoiceNumber) {
                    const existingByNumber = await InvoiceModel.findOne({ invoiceNumber: data.invoiceNumber });
                    if (existingByNumber) {
                      await InvoiceModel.findByIdAndUpdate(existingByNumber._id, { ...data, customerId: customer ? customer._id : existingByNumber.customerId }, { new: true, runValidators: true });
                      updated++;
                    } else {
                      throw e;
                    }
                  } else {
                    throw e;
                  }
                }
              }
              fetched++;
            } catch (e) {
              errors.push({ id: inv.Id, message: e.message });
            }
          }
          offset += limit;
        }
      } else if (usingSmartCheckpoint && fetched === 0 && (created === 0 && updated === 0)) {
        logger.info("Smart checkpoint prevented unnecessary invoice import", {
          lastPullAt: ext?.lastInvoicePullAt,
          lastPushAt: ext?.lastInvoicePushAt,
          reason: "no records newer than effective checkpoint (max of pull/push timestamps)"
        });
      }

      const now = new Date();
      await QuickBooksConnection.findOneAndUpdate(
        { userId: tenantId },
        { lastSyncAt: now }
      );
      if (fetched > 0 || created > 0 || updated > 0) {
        await ConnTable.findOneAndUpdate(
          { userId: tenantId },
          { lastSyncAt: now, lastInvoicePullAt: now },
          { upsert: false }
        );
      }

      logger.info("Invoice import from QBO completed", {
        tenantId,
        fetched,
        created,
        updated,
        errors: errors.length,
      });
      const status = errors.length === 0 ? "success" : "partial";
      await this.recordSyncHistory(tenantId, "invoices", status, created + updated, errors[0]?.message || null);

      console.log("=== INVOICE SYNC COMPLETED SUCCESSFULLY ===");
      console.log("Fetched:", fetched, "Created:", created, "Updated:", updated, "Errors:", errors.length);
      console.log("Total Duration:", `${Math.round((Date.now() - startTime) / 1000)}s`);
      console.log("Timestamp:", new Date().toISOString());

      logger.info("Invoice sync completed successfully", {
        tenantId,
        fetched,
        created,
        updated,
        errors: errors.length,
        totalDurationMs: Date.now() - startTime,
        totalDurationFormatted: `${Math.round((Date.now() - startTime) / 1000)}s`,
        averageTimePerInvoice: fetched > 0 ? Math.round((Date.now() - startTime) / fetched) : 0,
        completedAt: new Date().toISOString()
      });

      return { success: true, fetched, created, updated, errors };
    } catch (error) {
      console.error("=== INVOICE SYNC MAIN ERROR ===");
      console.error("Tenant ID:", tenantId);
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);
      console.error("Timestamp:", new Date().toISOString());
      console.error("=== END INVOICE SYNC MAIN ERROR ===");
      
      logger.error("Error syncing invoices from QBO", {
        error: error.message,
        stack: error.stack,
        tenantId,
      });
      try { await this.recordSyncHistory(tenantId, "invoices", "failed", 0, error.message); } catch {}
      throw error;
    }
  }

  async syncItemsFromQbo(tenantId, dal) {
    throw new NotImplementedError("syncItemsFromQbo not implemented yet");
  }

  async syncCustomersToQbo(tenantId, dal, options = {}) {
    const { force = false, startDate, endDate } = options;
    try {
      logger.info("=== CUSTOMER SYNC TO QBO STARTED ===", { 
        tenantId, 
        force,
        startDate,
        endDate,
        optionsReceived: options
      });
      
      // Add console log for debugging
      console.log("=== CUSTOMER SYNC DEBUG ===");
      console.log("Force:", force);
      console.log("Start Date:", startDate);
      console.log("End Date:", endDate);
      console.log("Options:", JSON.stringify(options, null, 2));
      
      logger.info("Step 1: Getting QuickBooks connection");
      const connection = await this.ensureValidConnection(tenantId);
      logger.info("Step 2: Getting QuickBooks connection table entry");
      const ConnTable = require("../models/QuickBooksConnectionTable");
      const ext = await ConnTable.findActiveByUserId(tenantId);
      
      logger.info("Step 3: Creating QuickBooks client");
      const qbo = this.getQboClient(
        tenantId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      logger.info("Step 4: Building sync conditions and query");
      let baseQuery = {}; // Initialize the query object
      
      // Apply sync conditions based on user selections
      if (startDate || endDate) {
        // Date range provided
        const dateRange = {};
        if (startDate && endDate) {
          dateRange.$gte = new Date(startDate);
          dateRange.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        } else if (startDate) {
          dateRange.$gte = new Date(startDate);
        } else if (endDate) {
          dateRange.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        }
        
        if (force) {
          // Case 2: Date range + force = ALL customers in that range
          baseQuery.$or = [
            { createdAt: dateRange },
            { updatedAt: dateRange }
          ];
          logger.info("Customer push mode: Date range + Force - pushing ALL customers in range", {
            startDate,
            endDate,
            force: true,
            queryFilter: baseQuery
          });
        } else {
          // Case 1: Date range only = only NEW/UPDATED customers in that range
          if (ext?.lastCustomerPushAt) {
            baseQuery.$and = [
              { 
                $or: [
                  { createdAt: dateRange },
                  { updatedAt: dateRange }
                ]
              },
              { updatedAt: { $gt: new Date(ext.lastCustomerPushAt) } }
            ];
          } else {
            // No checkpoint, just use date range for new/updated
            baseQuery.$or = [
              { createdAt: dateRange },
              { updatedAt: dateRange }
            ];
          }
          
          logger.info("Customer push mode: Date range only - pushing NEW/UPDATED customers in range", {
            startDate,
            endDate,
            force: false,
            lastPushAt: ext?.lastCustomerPushAt,
            queryFilter: baseQuery
          });
        }
      } else if (force) {
        // Case 3: Force only = ALL customers
        logger.info("Customer push mode: Force only - pushing ALL customers", {
          force: true,
          queryFilter: baseQuery
        });
        // baseQuery remains empty {} to get all customers
      } else {
        // Case 4: No date range, no force = only NEW/UPDATED customers since last sync
        // Use smart checkpoint: max of pull and push timestamps to avoid redundant syncing
        const lastPullAt = ext?.lastCustomerPullAt ? new Date(ext.lastCustomerPullAt) : null;
        const lastPushAt = ext?.lastCustomerPushAt ? new Date(ext.lastCustomerPushAt) : null;
        const effectiveCheckpoint = lastPullAt && lastPushAt 
          ? new Date(Math.max(lastPullAt.getTime(), lastPushAt.getTime()))
          : lastPullAt || lastPushAt;
        
        if (effectiveCheckpoint) {
          baseQuery.updatedAt = { $gt: effectiveCheckpoint };
          logger.info("Customer push mode: Default - pushing NEW/UPDATED customers since last sync", {
            lastPullAt: ext?.lastCustomerPullAt,
            lastPushAt: ext?.lastCustomerPushAt,
            effectiveCheckpoint: effectiveCheckpoint.toISOString(),
            queryFilter: baseQuery
          });
        } else {
          // No checkpoint - sync recent customers (last 7 days)
          const recentDate = new Date();
          recentDate.setDate(recentDate.getDate() - 7);
          baseQuery.$or = [
            { createdAt: { $gte: recentDate } },
            { updatedAt: { $gte: recentDate } }
          ];
          logger.info("Customer push mode: No checkpoint - pushing recent customers only", {
            recentSinceDate: recentDate.toISOString(),
            queryFilter: baseQuery
          });
        }
      }
      
      logger.info("Step 4: Building database query", {
        hasDateRange: !!(startDate || endDate),
        force,
        hasCheckpoint: !!(ext?.lastCustomerPullAt || ext?.lastCustomerPushAt)
      });
      
      logger.info("Executing customer database query", {
        baseQuery: JSON.stringify(baseQuery),
        queryType: force ? "force-all" : (startDate || endDate) ? "date-range" : "checkpoint-based"
      });

      logger.info("Step 5: Querying database for customers");
      const localCustomers = await Customer.find(baseQuery)
        .sort({ updatedAt: -1 })
        .limit(2000)
        .lean();
      
      logger.info("Step 6: Database query completed", {
        customersFound: localCustomers.length
      });

      logger.info("Found customers to sync", {
        count: localCustomers.length,
        hasDateRange: !!(startDate || endDate),
        force,
        isForce: force,
        hasCheckpoint: !!ext?.lastCustomerPushAt,
        finalQuery: baseQuery,
        sampleCustomers: localCustomers.slice(0, 3).map(cust => ({
          name: cust.name,
          email: cust.email,
          createdAt: cust.createdAt,
          updatedAt: cust.updatedAt,
          qboId: cust.qboId
        }))
      });

      let syncedCount = 0;
      let errorCount = 0;
      const errorDetails = [];

      const parseAddressString = (addr) => {
        if (!addr || typeof addr !== "string") return { Line1: undefined, City: undefined, CountrySubDivisionCode: undefined, PostalCode: undefined, Country: undefined };
        
        // Expected format: "street, city, state, zipCode, country"
        const parts = addr.split(",").map((p) => p.trim()).filter(Boolean);
        
        let street = undefined, city = undefined, state = undefined, zip = undefined, country = undefined;
        
        if (parts.length >= 5) {
          // Full address with all 5 components
          [street, city, state, zip, country] = parts;
        } else if (parts.length === 4) {
          // Missing one component, try to determine which
          // Check if last part looks like a country (typically longer, no numbers)
          if (!/\d/.test(parts[3]) && parts[3].length > 2) {
            // Likely: street, city, state, country (no zipCode)
            [street, city, state, country] = parts;
          } else {
            // Likely: street, city, state, zipCode (no country)
            [street, city, state, zip] = parts;
          }
        } else if (parts.length === 3) {
          [street, city, state] = parts;
        } else if (parts.length === 2) {
          [street, city] = parts;
        } else if (parts.length === 1) {
          street = parts[0];
        }
        
        return {
          Line1: street || undefined,
          City: city || undefined,
          CountrySubDivisionCode: state || undefined,
          PostalCode: zip || undefined,
          Country: country || undefined,
        };
      };

      for (const customer of localCustomers) {
        try {
          logger.info("Processing customer for sync", {
            customerId: customer._id,
            name: customer.name,
            email: customer.email,
            hasQboId: !!customer.qboId
          });
          
          // Check if customer already exists in QuickBooks
          let qboCustomer = null;
          
          // First try to find by email (most reliable)
          if (customer.email) {
            try { 
              qboCustomer = await this.findCustomerByEmail(tenantId, customer.email); 
              if (qboCustomer) {
                logger.info("Found existing QBO customer by email", {
                  customerId: customer._id,
                  qboId: qboCustomer.Id,
                  email: customer.email
                });
              }
            } catch (e) {
              logger.warn("Error finding customer by email", { error: e.message, email: customer.email });
            }
          }
          
          // If not found by email, try by name
          if (!qboCustomer && customer.name) {
            try { 
              qboCustomer = await this.findCustomerByName(tenantId, customer.name); 
              if (qboCustomer) {
                logger.info("Found existing QBO customer by name", {
                  customerId: customer._id,
                  qboId: qboCustomer.Id,
                  name: customer.name
                });
              }
            } catch (e) {
              logger.warn("Error finding customer by name", { error: e.message, name: customer.name });
            }
          }

          if (qboCustomer) {
            // Update existing customer
            const billAddrFromString = customer.address ? parseAddressString(customer.address) : {};
            const hasBill = Object.values(billAddrFromString).some(Boolean);
            const updatePayload = {
              DisplayName: customer.name,
              CompanyName: customer.companyName,
              PrimaryEmailAddr: customer.email
                ? { Address: customer.email }
                : undefined,
              PrimaryPhone: customer.phone
                ? { FreeFormNumber: customer.phone }
                : undefined,
              BillAddr: hasBill ? billAddrFromString : undefined,
              Active: customer.isActive !== false,
            };

            await this.updateCustomer(tenantId, qboCustomer.Id, updatePayload);
            // Ensure local record stores qboId
            try { await dal.updateCustomer(customer._id, { qboId: qboCustomer.Id }); } catch {}
            logger.info("Updated customer in QuickBooks", {
              customerId: customer._id,
              qboId: qboCustomer.Id,
            });
          } else {
            // Create new customer - but first do one more comprehensive check for duplicates
            const billAddrFromString = customer.address ? parseAddressString(customer.address) : {};
            const hasBill = Object.values(billAddrFromString).some(Boolean);
            const createPayload = {
              DisplayName: customer.name,
              CompanyName: customer.companyName,
              PrimaryEmailAddr: customer.email
                ? { Address: customer.email }
                : undefined,
              PrimaryPhone: customer.phone
                ? { FreeFormNumber: customer.phone }
                : undefined,
              BillAddr: hasBill ? billAddrFromString : undefined,
              Active: customer.isActive !== false,
            };

            // Log what we're about to send to QuickBooks
            logger.info("Creating customer in QuickBooks with payload", {
              customerId: customer._id,
              customerName: customer.name,
              hasEmail: !!customer.email,
              hasPhone: !!customer.phone,
              hasAddress: !!customer.address,
              parsedAddress: billAddrFromString,
              fullPayload: createPayload
            });

            // Before creating, do one final check for existing customer by name
            // This helps prevent the 6240 error
            let existingByName = null;
            if (customer.name) {
              try {
                existingByName = await this.findCustomerByName(tenantId, customer.name);
                if (existingByName?.Id) {
                  logger.info("Found existing customer by name before create attempt, updating instead", {
                    customerId: customer._id,
                    qboId: existingByName.Id,
                    customerName: customer.name
                  });
                  
                  // Update instead of create
                  await this.updateCustomer(tenantId, existingByName.Id, createPayload);
                  try { await dal.updateCustomer(customer._id, { qboId: existingByName.Id }); } catch {}
                  logger.info("Updated existing customer instead of creating duplicate", {
                    customerId: customer._id,
                    qboId: existingByName.Id,
                  });
                  syncedCount++;
                  continue; // Skip to next customer
                }
              } catch (e) {
                logger.warn("Error checking for existing customer by name", { 
                  error: e.message, 
                  name: customer.name 
                });
              }
            }

            // Proceed with creation since no duplicate was found
            try {
              const newQboCustomer = await this.createCustomer(
                tenantId,
                createPayload
              );

              // Update local customer with QuickBooks ID
              try {
                await dal.updateCustomer(customer._id, {
                  qboId: newQboCustomer.Id,
                });
              } catch (updateErr) {
                logger.warn("Failed to update local customer with QBO ID after creation", {
                  customerId: customer._id,
                  qboId: newQboCustomer.Id,
                  error: updateErr.message
                });
              }
              
              logger.info("Created customer in QuickBooks successfully", {
                customerId: customer._id,
                qboId: newQboCustomer.Id,
                customerName: customer.name,
                syncedEmail: !!newQboCustomer.PrimaryEmailAddr?.Address,
                syncedPhone: !!newQboCustomer.PrimaryPhone?.FreeFormNumber,
                syncedAddress: !!newQboCustomer.BillAddr,
                qboCustomerData: {
                  email: newQboCustomer.PrimaryEmailAddr?.Address,
                  phone: newQboCustomer.PrimaryPhone?.FreeFormNumber,
                  address: newQboCustomer.BillAddr
                }
              });
            } catch (eCreate) {
              // Handle duplicate name error by finding and updating existing customer
              const message = eCreate?.message || "";
              const isDuplicateName = message.includes("Duplicate Name") || 
                                    message.includes("6240") || 
                                    message.includes("already exists") ||
                                    message.includes("name supplied already exists");
              
              if (isDuplicateName) {
                logger.warn("Duplicate name detected, attempting to find and update existing customer", {
                  customerId: customer._id,
                  customerName: customer.name,
                  error: message
                });
                
                try {
                  // Try to find the existing customer by name
                  const existingQbo = await this.findCustomerByName(tenantId, customer.name);
                  if (existingQbo?.Id) {
                    // Update the existing QuickBooks customer with our data
                    await this.updateCustomer(tenantId, existingQbo.Id, createPayload);
                    
                    // Update local customer with QuickBooks ID
                    try { 
                      await dal.updateCustomer(customer._id, { qboId: existingQbo.Id }); 
                    } catch (updateErr) {
                      logger.warn("Failed to update local customer with QBO ID", { 
                        customerId: customer._id, 
                        qboId: existingQbo.Id,
                        error: updateErr.message 
                      });
                    }
                    
                    logger.info("Successfully resolved duplicate by updating existing QBO customer", { 
                      customerId: customer._id, 
                      qboId: existingQbo.Id,
                      customerName: customer.name
                    });
                  } else {
                    logger.error("Could not find existing customer by name despite duplicate error", {
                      customerId: customer._id,
                      customerName: customer.name
                    });
                    throw eCreate;
                  }
                } catch (e2) {
                  logger.error("Failed to resolve duplicate name error", {
                    customerId: customer._id,
                    customerName: customer.name,
                    originalError: message,
                    resolveError: e2.message
                  });
                  throw eCreate; // Throw original error if resolution fails
                }
              } else {
                throw eCreate;
              }
            }
          }

          syncedCount++;
        } catch (error) {
          const formatted = formatQboError(error);
          logger.error("Error syncing customer", {
            customerId: customer._id,
            error: formatted,
          });
          errorCount++;
          errorDetails.push({ customerId: String(customer._id), name: customer.name, email: customer.email, message: formatted });
        }
      }

      // Update last push checkpoint
      const now = new Date();
      await QuickBooksConnection.findOneAndUpdate(
        { userId: tenantId },
        { lastSyncAt: now }
      );
      await ConnTable.findOneAndUpdate(
        { userId: tenantId },
        { lastSyncAt: now, lastCustomerPushAt: now },
        { upsert: false }
      );

      logger.info("Customer sync completed", {
        tenantId,
        syncedCount,
        errorCount,
        totalCustomers: Array.isArray(localCustomers) ? localCustomers.length : 0,
      });

      const status = errorCount === 0 ? "success" : (syncedCount > 0 ? "partial" : "failed");
      await this.recordSyncHistory(
        tenantId,
        "customers",
        status,
        syncedCount,
        errorDetails?.[0]?.message || null
      );

      return {
        success: true,
        syncedCount,
        errorCount,
        totalCustomers: Array.isArray(localCustomers) ? localCustomers.length : 0,
        errorDetails,
      };
    } catch (error) {
      logger.error("Error syncing customers to QuickBooks", {
        error: error.message,
        stack: error.stack,
        tenantId,
        errorType: error.constructor.name,
        errorCode: error.code || error.statusCode
      });
      
      // Provide specific error messages for common issues
      let errorMessage = error.message;
      if (error.message?.includes("401") || error.message?.includes("token")) {
        errorMessage = "QuickBooks authentication failed. Please reconnect your QuickBooks account.";
      } else if (error.message?.includes("SSL") || error.message?.includes("ECONNRESET")) {
        errorMessage = "Connection error with QuickBooks. Please try again.";
      }
      
      try { await this.recordSyncHistory(tenantId, "customers", "failed", 0, errorMessage); } catch {}
      throw new Error(errorMessage);
    }
  }

  
  /**
   * Sync local invoices to QuickBooks
   */
  async syncInvoicesToQbo(tenantId, dal, options = {}) {
    const { force = false, startDate, endDate } = options;
    try {
      logger.info("Starting invoice sync to QuickBooks", { 
        tenantId, 
        force,
        startDate,
        endDate
      });
      
      const connection = await this.ensureValidConnection(tenantId);
      const ConnTable = require("../models/QuickBooksConnectionTable");
      const ext = await ConnTable.findActiveByUserId(tenantId);

      const qbo = this.getQboClient(
        tenantId,
        connection.accessToken,
        connection.realmId,
        connection.refreshToken
      );

      const InvoiceModel = require("../models/Invoice");
      const CustomerModel = require("../models/Customer");
      const ProductModel = require("../models/Product");

      let query = {}; // Initialize the query object
      
      // Apply sync conditions based on user selections
      if (startDate || endDate) {
        // Date range provided
        const dateRange = {};
        if (startDate && endDate) {
          dateRange.$gte = new Date(startDate);
          dateRange.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        } else if (startDate) {
          dateRange.$gte = new Date(startDate);
        } else if (endDate) {
          dateRange.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        }
        
        if (force) {
          // Case 2: Date range + force = ALL invoices in that range
          query.$or = [
            { issueDate: dateRange },
            { createdAt: dateRange },
            { updatedAt: dateRange }
          ];
          logger.info("Invoice push mode: Date range + Force - pushing ALL invoices in range", {
            startDate,
            endDate,
            force: true,
            queryFilter: query
          });
        } else {
          // Case 1: Date range only = only NEW/UPDATED invoices in that range
          if (ext?.lastInvoicePushAt) {
            query.$and = [
              { 
                $or: [
                  { issueDate: dateRange },
                  { createdAt: dateRange },
                  { updatedAt: dateRange }
                ]
              },
              { updatedAt: { $gt: new Date(ext.lastInvoicePushAt) } }
            ];
          } else {
            // No checkpoint, just use date range for new/updated
            query.$or = [
              { issueDate: dateRange },
              { createdAt: dateRange },
              { updatedAt: dateRange }
            ];
          }
          
          logger.info("Invoice push mode: Date range only - pushing NEW/UPDATED invoices in range", {
            startDate,
            endDate,
            force: false,
            lastPushAt: ext?.lastInvoicePushAt,
            queryFilter: query
          });
        }
      } else if (force) {
        // Case 3: Force only = ALL invoices
        logger.info("Invoice push mode: Force only - pushing ALL invoices", {
          force: true,
          queryFilter: query
        });
        // query remains empty {} to get all invoices
      } else {
        // Case 4: No date range, no force = only NEW/UPDATED invoices since last sync
        // Use smart checkpoint: max of pull and push timestamps to avoid redundant syncing
        const lastPullAt = ext?.lastInvoicePullAt ? new Date(ext.lastInvoicePullAt) : null;
        const lastPushAt = ext?.lastInvoicePushAt ? new Date(ext.lastInvoicePushAt) : null;
        const effectiveCheckpoint = lastPullAt && lastPushAt 
          ? new Date(Math.max(lastPullAt.getTime(), lastPushAt.getTime()))
          : lastPullAt || lastPushAt;
        
        if (effectiveCheckpoint) {
          query.updatedAt = { $gt: effectiveCheckpoint };
          logger.info("Invoice push mode: Default - pushing NEW/UPDATED invoices since last sync", {
            lastPullAt: ext?.lastInvoicePullAt,
            lastPushAt: ext?.lastInvoicePushAt,
            effectiveCheckpoint: effectiveCheckpoint.toISOString(),
            queryFilter: query
          });
        } else {
          // No checkpoint - sync recent invoices
          logger.info("Invoice push mode: No checkpoint - pushing all recent invoices", {
            queryFilter: query
          });
        }
      }
      
      const localInvoices = await InvoiceModel.find(query)
        .populate("customerId")
        .sort({ updatedAt: -1 })
        .limit(1000)
        .lean();

      logger.info("Found invoices to sync", {
        count: localInvoices.length,
        hasDateRange: !!(startDate || endDate),
        force,
        query,
        sampleInvoices: localInvoices.slice(0, 3).map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          issueDate: inv.issueDate,
          createdAt: inv.createdAt,
          updatedAt: inv.updatedAt,
          qboId: inv.qboId
        }))
      });

  let synced = 0;
  let errors = 0;
  const errorDetails = [];

      // Helper to build QBO Invoice payload
      const buildQboInvoice = async (inv) => {
        // CustomerRef
        let customerRef = null;
        const cust = inv.customerId;
        if (cust?.qboId) {
          customerRef = { value: String(cust.qboId) };
        } else if (cust?.email) {
          const qboCust = await this.findCustomerByEmail(tenantId, cust.email);
          if (qboCust?.Id) customerRef = { value: qboCust.Id };
        }

        const lines = [];
        for (const item of inv.items || []) {
          const qty = Number(item.quantity) || 1;
          const rate = Number(item.unitPrice) || 0;
          // Try to resolve QBO ItemRef via SKU match in QBO is not trivial here.
          // We’ll set description and amount; ItemRef optional.
          const line = {
            Amount: Math.max(0, qty * rate - (Number(item.discount) || 0)),
            DetailType: "SalesItemLineDetail",
            Description: item.description || "",
            SalesItemLineDetail: {
              Qty: qty,
              UnitPrice: rate,
              // Include tax information if available
              TaxCodeRef: item.taxRate && item.taxRate > 0 ? { value: "TAX" } : { value: "NON" },
            },
          };
          // Attempt to attach ItemRef by name lookup (required for proper inventory tracking)
          const productName = item.productName || item.name || item.sku;
          let itemRefFound = false;
          try {
            if (productName) {
              const found = await this.findItemByName(tenantId, productName);
              if (found?.Id) {
                line.SalesItemLineDetail.ItemRef = { value: found.Id };
                itemRefFound = true;
                logger.debug("Found QuickBooks item for invoice line", {
                  productName,
                  qboItemId: found.Id,
                  invoiceNumber: inv.invoiceNumber
                });
              }
            }
          } catch (err) {
            logger.warn("Error looking up QuickBooks item", {
              productName,
              error: err.message,
              invoiceNumber: inv.invoiceNumber
            });
          }
          
          // If ItemRef not found, log a warning as this will cause QB to use generic "Sales" item
          if (!itemRefFound) {
            logger.warn("QuickBooks item not found - invoice will use generic 'Sales' item", {
              productName,
              invoiceNumber: inv.invoiceNumber,
              suggestion: `Create a product/service named "${productName}" in QuickBooks or ensure the name matches exactly`
            });
          }
          lines.push(line);
        }

        if (!customerRef) {
          const errorMsg = `Cannot push invoice ${inv.invoiceNumber} without a matching QuickBooks customer (CustomerRef not found)`;
          logger.error(errorMsg, {
            invoiceId: String(inv._id),
            invoiceNumber: inv.invoiceNumber,
            customerId: String(cust?._id || 'none'),
            customerEmail: cust?.email,
            customerQboId: cust?.qboId,
          });
          throw new Error(errorMsg);
        }

        const payload = {
          CustomerRef: customerRef || undefined,
          Line: lines,
          TxnDate: inv.issueDate ? new Date(inv.issueDate).toISOString().slice(0, 10) : undefined,
          DueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : undefined,
          PrivateNote: inv.notes,
          DocNumber: String(inv.invoiceNumber),
          // Add PO Number - use provided value or default to "N/A"
          PONumber: (inv.poNumber && String(inv.poNumber).trim() !== '') ? String(inv.poNumber).trim() : "N/A",
          // Include total tax amount at invoice level if applicable
          TxnTaxDetail: (inv.taxAmount && inv.taxAmount > 0) ? {
            TotalTax: Number(inv.taxAmount) || 0
          } : undefined,
        };
        
        // Validate payload before sending
        if (!payload.CustomerRef?.value) {
          throw new Error(`Invalid CustomerRef for invoice ${inv.invoiceNumber}`);
        }
        if (!payload.Line || payload.Line.length === 0) {
          throw new Error(`Invoice ${inv.invoiceNumber} has no line items`);
        }
        if (!payload.DocNumber || String(payload.DocNumber).trim() === '') {
          throw new Error(`Invoice ${inv.invoiceNumber} missing or invalid DocNumber`);
        }
        
        logger.debug("Final QuickBooks invoice payload", {
          invoiceNumber: inv.invoiceNumber,
          customerRef: payload.CustomerRef?.value,
          lineCount: payload.Line?.length,
          docNumber: payload.DocNumber,
          poNumber: payload.PONumber,
          taxAmount: payload.TxnTaxDetail?.TotalTax,
        });
        
        return payload;
      };

      for (const inv of localInvoices) {
        try {
          logger.info("Attempting to sync invoice to QuickBooks", {
            invoiceId: String(inv._id),
            invoiceNumber: inv.invoiceNumber,
            qboId: inv.qboId,
            tenantId,
          });
          
          const payload = await buildQboInvoice(inv);
          
          logger.debug("Built QuickBooks invoice payload", {
            invoiceId: String(inv._id),
            invoiceNumber: inv.invoiceNumber,
            payloadKeys: Object.keys(payload),
            customerRef: payload.CustomerRef,
            lineCount: payload.Line?.length || 0,
            poNumber: payload.PONumber,
            invPoNumber: inv.poNumber,
          });
          
          if (inv.qboId) {
            await this.updateInvoice(tenantId, inv.qboId, payload);
            logger.info("Successfully updated invoice in QuickBooks", {
              invoiceId: String(inv._id),
              invoiceNumber: inv.invoiceNumber,
              qboId: inv.qboId,
            });
            
            // Sync payment if invoice has been paid
            if (inv.amountPaid > 0 && inv.qboId) {
              try {
                await this.syncPaymentForInvoice(tenantId, inv);
                logger.info("Successfully synced payment for invoice", {
                  invoiceId: String(inv._id),
                  invoiceNumber: inv.invoiceNumber,
                  amountPaid: inv.amountPaid,
                });
              } catch (paymentErr) {
                logger.error("Failed to sync payment for invoice (non-fatal)", {
                  invoiceId: String(inv._id),
                  invoiceNumber: inv.invoiceNumber,
                  error: paymentErr.message,
                });
                // Don't fail the invoice sync if payment sync fails
              }
            }
          } else {
            const created = await this.createInvoice(tenantId, payload);
            // Persist qboId back to local invoice
            await InvoiceModel.findByIdAndUpdate(inv._id, {
              qboId: created?.Id,
              qboSyncStatus: "synced",
              qboLastSync: new Date(),
            });
            logger.info("Successfully created invoice in QuickBooks", {
              invoiceId: String(inv._id),
              invoiceNumber: inv.invoiceNumber,
              qboId: created?.Id,
            });
            
            // Sync payment if invoice has been paid
            if (inv.amountPaid > 0 && created?.Id) {
              try {
                await this.syncPaymentForInvoice(tenantId, { ...inv, qboId: created.Id });
                logger.info("Successfully synced payment for newly created invoice", {
                  invoiceId: String(inv._id),
                  invoiceNumber: inv.invoiceNumber,
                  amountPaid: inv.amountPaid,
                });
              } catch (paymentErr) {
                logger.error("Failed to sync payment for newly created invoice (non-fatal)", {
                  invoiceId: String(inv._id),
                  invoiceNumber: inv.invoiceNumber,
                  error: paymentErr.message,
                });
                // Don't fail the invoice sync if payment sync fails
              }
            }
          }
          synced++;
        } catch (err) {
          const formatted = formatQboError(err);
          const detail = {
            invoiceId: String(inv._id),
            invoiceNumber: inv.invoiceNumber,
            message: formatted,
            originalError: err?.message || "No error message",
          };
          logger.error("Failed to sync invoice to QBO", {
            ...detail,
            errorType: err?.constructor?.name,
            errorCode: err?.code,
            stack: err?.stack?.split('\n').slice(0, 3).join('; '),
          });
          errorDetails.push(detail);
          errors++;
        }
      }

      const now = new Date();
      await QuickBooksConnection.findOneAndUpdate(
        { userId: tenantId },
        { lastSyncAt: now }
      );
      await ConnTable.findOneAndUpdate(
        { userId: tenantId },
        { lastSyncAt: now, lastInvoicePushAt: now },
        { upsert: false }
      );

      const status = errors === 0 ? "success" : (synced > 0 ? "partial" : "failed");
      await this.recordSyncHistory(
        tenantId,
        "invoices",
        status,
        synced,
        errorDetails?.[0]?.message || null
      );

      return { success: true, synced, errors, total: localInvoices.length, errorDetails };
    } catch (error) {
      logger.error("Error syncing invoices to QuickBooks", {
        error: error.message,
        tenantId,
      });
      try { await this.recordSyncHistory(tenantId, "invoices", "failed", 0, error.message); } catch {}
      throw error;
    }
  }

  /**
   * Sync local items to QuickBooks
   */
  async syncItemsToQbo(tenantId, dal) {
    throw new NotImplementedError("syncItemsToQbo not implemented yet");
  }

  /**
   * Get QuickBooks company info
   */
  async getCompanyInfo(tenantId, accessToken, realmId) {
    try {
      const qbo = this.getQboClient(tenantId, accessToken, realmId);

      return new Promise((resolve, reject) => {
        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
          reject(new Error("Company info request timed out after 30 seconds"));
        }, 30000);

        qbo.getCompanyInfo((err, companyInfo) => {
          clearTimeout(timeout);

          if (err) {
            logger.error("Failed to get company info", {
              error: err.message,
              tenantId,
            });
            reject(err);
          } else {
            logger.info("Company info retrieved successfully", {
              companyName: companyInfo.CompanyName,
              tenantId,
            });
            resolve(companyInfo);
          }
        });
      });
    } catch (error) {
      logger.error("Error getting company info", {
        error: error.message,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Get QuickBooks preferences
   */
  async getPreferences(tenantId) {
    throw new NotImplementedError("getPreferences not implemented yet");
  }

  /**
   * Disconnect QuickBooks integration
   */
  async disconnectOAuth(userId) {
    try {
      const connection = await QuickBooksConnection.findActiveByUserId(userId);

      if (!connection) {
        throw new Error("No QuickBooks connection found");
      }

      // Mark connection as inactive
      await QuickBooksConnection.findOneAndUpdate(
        { userId },
        { isActive: false }
      );

      logger.info("QuickBooks OAuth disconnected successfully", { userId });
      return { message: "QuickBooks connection disconnected successfully" };
    } catch (error) {
      logger.error("Error disconnecting QuickBooks OAuth", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Validate QuickBooks connection
   */
  async validateConnection(tenantId) {
    throw new NotImplementedError("validateConnection not implemented yet");
  }

  /**
   * Get QuickBooks OAuth status
   */
  async getOAuthStatus(userId) {
    try {
      const connection = await QuickBooksConnection.findActiveByUserId(userId);

      if (!connection) {
        return {
          connected: false,
          message: "No QuickBooks connection found",
        };
      }

      // Check if token is expired
      if (connection.isTokenExpired) {
        try {
          // Try to refresh the token
          await this.refreshToken(userId, connection.refreshToken);
          // Reload connection after refresh
          const refreshedConnection =
            await QuickBooksConnection.findActiveByUserId(userId);
          return {
            connected: true,
            companyName: refreshedConnection.companyName,
            lastSync: refreshedConnection.lastSyncAt,
            expiresAt: refreshedConnection.tokenExpiresAt,
            environment: refreshedConnection.environment,
          };
        } catch (error) {
          logger.error("Token refresh failed", {
            error: error.message,
            userId,
          });
          return {
            connected: false,
            message: "Token expired and refresh failed",
          };
        }
      }

      return {
        connected: true,
        companyName: connection.companyName,
        lastSync: connection.lastSyncAt,
        expiresAt: connection.tokenExpiresAt,
        environment: connection.environment,
      };
    } catch (error) {
      logger.error("Error getting OAuth status", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get QuickBooks sync status
   */
  async getSyncStatus(tenantId) {
    throw new NotImplementedError("getSyncStatus not implemented yet");
  }

  /**
   * Handle QuickBooks webhook
   */
  async handleWebhook(tenantId, payload, signature) {
    logger.info("QBO webhook received", {
      tenantId,
      payload: JSON.stringify(payload),
    });

    // Verify webhook signature (implement based on QBO webhook verification)
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new Error("Invalid webhook signature");
    }

    // Process webhook based on event type
    const eventType =
      payload.eventNotifications?.[0]?.dataChangeEvent?.entities?.[0]?.name;

    switch (eventType) {
      case "Customer":
        // Handle customer changes
        break;
      case "Invoice":
        // Handle invoice changes
        break;
      case "Item":
        // Handle item changes
        break;
      default:
        logger.warn("Unknown QBO webhook event type", { eventType });
    }

    return { success: true };
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    // Implement webhook signature verification
    // This is a placeholder - implement based on QBO webhook documentation
    return true;
  }

  /**
   * Get QuickBooks API limits and usage
   */
  async getApiUsage(tenantId) {
    throw new NotImplementedError("getApiUsage not implemented yet");
  }

  /**
   * Test QuickBooks connection
   */
  async testConnection(tenantId, accessToken, realmId) {
    try {
      const qbo = this.getQboClient(tenantId, accessToken, realmId);

      return new Promise((resolve, reject) => {
        qbo.getCompanyInfo((err, companyInfo) => {
          if (err) {
            logger.error("QBO connection test failed", { error: err.message });
            reject(err);
          } else {
            logger.info("QBO connection test successful", {
              companyName: companyInfo.CompanyName,
            });
            resolve(companyInfo);
          }
        });
      });
    } catch (error) {
      logger.error("QBO connection test error", { error: error.message });
      throw error;
    }
  }
}

module.exports = new QuickBooksService();
