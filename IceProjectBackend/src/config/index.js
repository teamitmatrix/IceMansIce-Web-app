require("dotenv").config();

const config = {
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || "0.0.0.0",
    env: process.env.NODE_ENV || "production",
  },
  app: {
    baseUrl: process.env.BASE_URL || "https://pwa-backend-fxw6.onrender.com",
  },
  frontend: {
    url: process.env.FRONTEND_URL || "https://icemansice.com",
  },
  database: {
    uri: process.env.MONGODB_URI || "",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "fallback-secret-key",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "30m", // Increased from 15m to 30m
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  // Redis and queues disabled - using scheduled sync instead
  redis: {
    url: process.env.REDIS_URL,
    enabled: false, // Disabled to avoid SSL issues
  },
  queues: {
    enabled: false, // Disabled - using node-cron scheduled sync instead
  },
  quickbooks: {
    clientId: process.env.QBO_CLIENT_ID,
    clientSecret: process.env.QBO_CLIENT_SECRET,
    redirectUri:
      process.env.QBO_REDIRECT_URI ||
      "https://pwa-backend-fxw6.onrender.com/qbo/oauth/callback",
    environment: process.env.QBO_ENVIRONMENT || "production",
    scope: process.env.QBO_SCOPE || "com.intuit.quickbooks.accounting",
    // SSL/TLS configuration - optimized for cloud platforms like Render
    sslVerify: process.env.QBO_SSL_VERIFY !== "false", // default to true for security
    tlsVersion: process.env.QBO_TLS_VERSION || "TLSv1_2_method", // Use TLS 1.2 for better compatibility
    isCloudPlatform: process.env.QBO_IS_CLOUD_PLATFORM === "true" || process.env.NODE_ENV === "production", // Detect cloud platform
    // Debug options
    skipConnectionTest: process.env.QBO_SKIP_CONNECTION_TEST === "true", // Skip connection test for debugging
    skipInvoiceConnectionTest: process.env.QBO_SKIP_INVOICE_CONNECTION_TEST === "true", // Skip connection test for invoices specifically  
    connectionTestTimeout: parseInt(process.env.QBO_CONNECTION_TEST_TIMEOUT) || 15000, // Connection test timeout in ms
    invoiceTimeout: parseInt(process.env.QBO_INVOICE_TIMEOUT) || 900000, // Invoice sync timeout in ms (15 minutes default, increased for large datasets)
  },
  payment: {
    provider: process.env.PAYMENT_PROVIDER || "dummy",
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    },
  },
  logging: {
    level: process.env.LOG_LEVEL || "info",
    prettyPrint: process.env.LOG_PRETTY_PRINT === "true",
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    },
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760,
    path: process.env.UPLOAD_PATH || "./uploads",
  },
  maps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
  },
  sync: {
    // Scheduled sync configuration
    enabled: true,
    schedule: process.env.SYNC_SCHEDULE || '0 2 * * *', // Daily at 2 AM UTC
    timezone: process.env.SYNC_TIMEZONE || 'UTC',
    // Enable frequent sync (every 6 hours) if needed
    frequentSync: process.env.SYNC_FREQUENT === 'true',
    // Batch and conflict settings
    batchSize: parseInt(process.env.SYNC_BATCH_SIZE) || 100,
    conflictResolution: process.env.SYNC_CONFLICT_RESOLUTION || 'last-write-wins',
  },
};

module.exports = config;