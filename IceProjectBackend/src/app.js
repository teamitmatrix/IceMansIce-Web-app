const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const config = require("./config");
const logger = require("./utils/logger");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");
const customerRoutes = require("./routes/customers");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const invoiceRoutes = require("./routes/invoices");
const paymentRoutes = require("./routes/payments");
const inventoryRoutes = require("./routes/inventory");
const routeRoutes = require("./routes/routes");
const adminRoutes = require("./routes/admin");
const qboRoutes = require("./routes/qbo");
const syncRoutes = require("./routes/sync");
const driverRoutes = require("./routes/driver");
const customerPortalRoutes = require("./routes/customerPortal");
const settingsRoutes = require("./routes/settings");
const orderFormsRoutes = require("./routes/orderForms");
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Sales System API",
      version: "1.0.0",
      description:
        "Production-ready Node.js backend for sales system with Customer Portal and QuickBooks Online integration",
      contact: {
        name: "API Support",
        email: "support@sales-system.com",
      },
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/models/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

function createApp() {
  const app = express();

  // Configure helmet with proper CORS-friendly settings
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "https://icemansice.com", "https://www.icemansice.com", "https://pwa-backend-fxw6.onrender.com"],
        frameAncestors: ["'none'"],
      },
    },
  }));
  
  
  // Production-focused CORS configuration
  const allowedOrigins = [
    config.frontend.url,
    "https://icemansice.com",
    "https://www.icemansice.com",
    "http://localhost:3000", // Local development
    "http://localhost:3001", // Local development
    /^https:\/\/.*\.vercel\.app$/,  // Vercel preview deployments
    /^https:\/\/.*\.ngrok-free\.dev$/,  // ngrok for testing
    "https://pwa-backend-fxw6.onrender.com",  // Production backend
  ];
  
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, server-to-server)
      if (!origin) {
        logger.info('CORS: Request with no origin (likely server-to-server or tool)');
        return callback(null, true);
      }
      
      // Log the origin for debugging
      logger.debug(`CORS: Checking origin: ${origin}`);
      
      // Always allow icemansice.com and its subdomains
      if (origin.endsWith('icemansice.com') || origin === 'https://icemansice.com' || origin === 'https://www.icemansice.com') {
        logger.info(`CORS: ✓ Allowed icemansice.com subdomain: ${origin}`);
        return callback(null, true);
      }
      
      // Check if origin is allowed
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (typeof allowedOrigin === 'string') {
          const match = origin === allowedOrigin;
          logger.info(`CORS: String comparison - ${origin} === ${allowedOrigin}: ${match}`);
          return match;
        }
        if (allowedOrigin instanceof RegExp) {
          const match = allowedOrigin.test(origin);
          logger.info(`CORS: Regex test - ${allowedOrigin.toString()} test ${origin}: ${match}`);
          return match;
        }
        return false;
      });
      
      if (isAllowed) {
        logger.info(`CORS: ✓ Allowed origin: ${origin}`);
        callback(null, true);
      } else {
        logger.warn(`CORS: ✗ Blocked origin: ${origin}`);
        logger.warn(`CORS: Allowed origins: ${JSON.stringify(allowedOrigins.map(o => o.toString()))}`);
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Authorization", 
      "Content-Type", 
      "Cache-Control", 
      "Pragma", 
      "X-Requested-With", 
      "Accept",
      "Expires",
      "If-None-Match",
      "If-Modified-Since"
    ],
    exposedHeaders: ["Content-Length", "Content-Type"],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
  };
  
  app.use(cors(corsOptions));
  
  // Explicit preflight handler for all routes
  app.options('*', cors(corsOptions));

  // Additional middleware to ensure CORS headers are always present
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    if (origin) {
      // Always allow icemansice.com and its subdomains
      if (origin.endsWith('icemansice.com') || origin === 'https://icemansice.com' || origin === 'https://www.icemansice.com') {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cache-Control, Pragma, X-Requested-With, Accept, Expires, If-None-Match, If-Modified-Since');
        return next();
      }
      
      // Check if origin is allowed
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (typeof allowedOrigin === 'string') {
          return origin === allowedOrigin;
        }
        if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cache-Control, Pragma, X-Requested-With, Accept, Expires, If-None-Match, If-Modified-Since');
      }
    }
    
    next();
  });

  // const limiter = rateLimit({
  //   windowMs: config.security.rateLimit.windowMs,
  //   max: config.security.rateLimit.maxRequests,
  //   message: {
  //     error: "Too many requests from this IP, please try again later.",
  //   },
  //   standardHeaders: true,
  //   legacyHeaders: false,
  // });
  // app.use(limiter);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    next();
  });

  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.server.env,
    });
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });


  app.use("/auth", authRoutes);
  app.use("/customers", customerRoutes);
  app.use("/products", productRoutes);
  app.use("/orders", orderRoutes);
  app.use("/invoices", invoiceRoutes);
  app.use("/payments", paymentRoutes);
  app.use("/inventory", inventoryRoutes);
  app.use("/routes", routeRoutes);
  app.use("/admin", adminRoutes);
  app.use("/qbo", qboRoutes);
  app.use("/sync", syncRoutes);
  app.use("/driver", driverRoutes);
  app.use("/customer-portal", customerPortalRoutes);
  app.use("/settings", settingsRoutes);
  app.use("/order-forms", orderFormsRoutes);

  app.use("*", (req, res) => {
    res.status(404).json({
      error: "Route not found",
      path: req.originalUrl,
    });
  });

  app.use(errorHandler);

  return app;
}

module.exports = createApp;
