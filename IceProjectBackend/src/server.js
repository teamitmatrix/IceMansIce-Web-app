const createApp = require("./app");
const config = require("./config");
const logger = require("./utils/logger");
const db = require("./db/db");
const scheduledSyncService = require("./jobs/scheduledSync");

async function startServer() {
  try {
    await db.connect();
    logger.info("Connected to MongoDB");

    const app = createApp();

    // Start scheduled sync service if enabled
    if (config.sync.enabled) {
      scheduledSyncService.start();
      logger.info("Scheduled sync service started");
    } else {
      logger.info("Scheduled sync service disabled");
    }

    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(
        `Server running on http://0.0.0.0:${config.server.port}`
      );
      logger.info(`Environment: ${config.server.env}`);
      
      // Use environment-appropriate URL for API documentation
      const apiDocUrl = process.env.API_BASE_URL 
        ? `${process.env.API_BASE_URL}/docs`
        : config.server.env === 'production' 
          ? `https://pwa-backend-fxw6.onrender.com/docs`
          : `http://localhost:${config.server.port}/docs`;
      
      logger.info(`API Documentation: ${apiDocUrl}`);
      if (config.sync.enabled) {
        logger.info(`Scheduled sync: ${config.sync.schedule} (${config.sync.timezone})`);
      }
    });

    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Stop scheduled sync service
      if (config.sync.enabled) {
        scheduledSyncService.stop();
        logger.info("Scheduled sync service stopped");
      }

      server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });

      setTimeout(() => {
        logger.error(
          "Could not close connections in time, forcefully shutting down"
        );
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Temporarily disable these to avoid crashes
    // process.on("uncaughtException", (error) => {
    //   logger.error("Uncaught Exception:", error);
    //   process.exit(1);
    // });

    // process.on("unhandledRejection", (reason, promise) => {
    //   logger.error("Unhandled Rejection at:", promise, "reason:", reason);
    //   process.exit(1);
    // });
  } catch (error) {
    // Provide a clearer hint if DB not configured
    const hint = !process.env.MONGODB_URI
      ? "MongoDB URI not set. Define MONGODB_URI in Render environment variables."
      : undefined;
    logger.error("Failed to start server:", { error: error?.message, hint });
    process.exit(1);
  }
}

startServer();
