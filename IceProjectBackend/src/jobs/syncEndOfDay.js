const { Queue, Worker } = require("bullmq");
const Redis = require("ioredis");
const config = require("../config");
const logger = require("../utils/logger");
const qboService = require("../services/quickbooksService");
const dal = require("../dal/MongoDAL");

// Create Redis connection
if (!config.queues.enabled) {
  module.exports = {
    queueEndOfDaySync: async () => {
      throw new Error("Queues are disabled (QUEUES_ENABLED=false)");
    },
    getJobStatus: async () => null,
    getQueueStats: async () => ({ waiting: 0, active: 0, completed: 0, failed: 0 }),
    cleanupCompletedJobs: async () => 0,
    shutdown: async () => {},
  };
  return;
}

// Create Redis connection with SSL configuration for cloud platforms
const redisOptions = { 
  maxRetriesPerRequest: null,
  // Enhanced SSL configuration for cloud platforms
  ...(config.redis.isCloudPlatform && {
    tls: config.redis.ssl,
    connectTimeout: 60000,
    lazyConnect: true,
    retryDelayOnFailover: 1000,
    maxRetriesPerRequest: 3,
  })
};

const redis = new Redis(config.redis.url, redisOptions);

// Create queue
const syncEndOfDayQueue = new Queue("sync-end-of-day", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

/**
 * Add end-of-day sync job to queue
 */
async function queueEndOfDaySync(date, warehouseId, userId) {
  try {
    // Initialize worker if not already done
    await initializeWorker();
    
    const job = await syncEndOfDayQueue.add(
      "sync-end-of-day",
      {
        date,
        warehouseId,
        userId,
        timestamp: new Date(),
      },
      {
        priority: 1, // High priority
        delay: 0, // Process immediately
        jobId: `end-of-day-${date}-${warehouseId || "all"}`,
      }
    );

    logger.info(`End-of-day sync job queued: ${job.id} for date ${date}`);

    return {
      jobId: job.id,
      status: "queued",
      estimatedDuration: "5-10 minutes",
    };
  } catch (error) {
    logger.error("Error queuing end-of-day sync job:", error);
    throw error;
  }
}

/**
 * Process end-of-day sync job
 */
async function processEndOfDaySync(job) {
  const { date, warehouseId, userId } = job.data;
  const startTime = Date.now();

  try {
    logger.info(
      `Starting end-of-day sync for date ${date}, warehouse: ${
        warehouseId || "all"
      }`
    );

    // Update job status
    await job.updateProgress(10);

    // 1. Get sales data for the date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const salesOrders = await dal.getSalesOrders({
      startDate: startOfDay,
      endDate: endOfDay,
      warehouseId,
      status: "completed",
    });

    await job.updateProgress(30);

    if (salesOrders.length === 0) {
      logger.info(`No sales orders found for date ${date}`);
      await job.updateProgress(100);
      return {
        message: "No sales orders to sync",
        ordersProcessed: 0,
        duration: Date.now() - startTime,
      };
    }

    // 2. Check QuickBooks connection
    const qboStatus = await qboService.getOAuthStatus(userId);
    if (!qboStatus.connected) {
      throw new Error("QuickBooks not connected");
    }

    await job.updateProgress(50);

    // 3. Sync sales orders to QuickBooks
    const syncResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < salesOrders.length; i++) {
      const order = salesOrders[i];

      try {
        // Create invoice in QuickBooks
        const qboInvoice = await qboService.createInvoice(order);
        syncResults.push({
          orderId: order._id,
          qboInvoiceId: qboInvoice.id,
          status: "success",
        });
        successCount++;
      } catch (error) {
        logger.error(`Error syncing order ${order._id} to QuickBooks:`, error);
        syncResults.push({
          orderId: order._id,
          error: error.message,
          status: "failed",
        });
        errorCount++;
      }

      // Update progress
      const progress = 50 + Math.floor((i / salesOrders.length) * 40);
      await job.updateProgress(progress);
    }

    await job.updateProgress(90);

    // 4. Create summary report
    const summary = {
      date,
      warehouseId,
      totalOrders: salesOrders.length,
      successfulSyncs: successCount,
      failedSyncs: errorCount,
      syncResults,
      duration: Date.now() - startTime,
    };

    // 5. Log sync results
    logger.info(`End-of-day sync completed for ${date}:`, summary);

    // 6. Update audit log
    await dal.createAuditLog({
      actorId: userId,
      action: "sync_end_of_day",
      entityType: "SalesOrder",
      entityId: null,
      diff: summary,
      at: new Date(),
    });

    await job.updateProgress(100);

    return summary;
  } catch (error) {
    logger.error("Error processing end-of-day sync job:", error);

    // Update audit log with error
    try {
      await dal.createAuditLog({
        actorId: userId,
        action: "sync_end_of_day_error",
        entityType: "SalesOrder",
        entityId: null,
        diff: { error: error.message, date, warehouseId },
        at: new Date(),
      });
    } catch (auditError) {
      logger.error("Error creating audit log:", auditError);
    }

    throw error;
  }
}

/**
 * Create and start worker - Initialize lazily to avoid startup crashes
 */
let worker = null;
let workerInitialized = false;

async function initializeWorker() {
  if (workerInitialized || worker) {
    return worker;
  }

  try {
    worker = new Worker("sync-end-of-day", processEndOfDaySync, {
      connection: redis,
      concurrency: 1, // Process one job at a time
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    // Worker event handlers
    worker.on("completed", (job, result) => {
      logger.info(`End-of-day sync job ${job.id} completed successfully:`, result);
    });

    worker.on("failed", (job, error) => {
      logger.error(`End-of-day sync job ${job.id} failed:`, error);
    });

    worker.on("error", (error) => {
      logger.error("Worker error:", error);
    });

    worker.on("stalled", (jobId) => {
      logger.warn(`Job ${jobId} stalled`);
    });

    workerInitialized = true;
    logger.info("End-of-day sync worker initialized successfully");
    return worker;
  } catch (err) {
    logger.error("End-of-day worker initialization failed", { error: err.message });
    worker = null;
    workerInitialized = false;
    throw err;
  }
}

/**
 * Get job status
 */
async function getJobStatus(jobId) {
  try {
    const job = await syncEndOfDayQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = await job.progress;
    const failedReason = job.failedReason;

    return {
      jobId: job.id,
      status: state,
      progress,
      failedReason,
      data: job.data,
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn,
    };
  } catch (error) {
    logger.error("Error getting job status:", error);
    throw error;
  }
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      syncEndOfDayQueue.getWaiting(),
      syncEndOfDayQueue.getActive(),
      syncEndOfDayQueue.getCompleted(),
      syncEndOfDayQueue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  } catch (error) {
    logger.error("Error getting queue stats:", error);
    throw error;
  }
}

/**
 * Clean up completed jobs
 */
async function cleanupCompletedJobs() {
  try {
    const completed = await syncEndOfDayQueue.getCompleted();
    const failed = await syncEndOfDayQueue.getFailed();

    // Remove jobs older than 7 days
    const cutoffDate = Date.now() - 7 * 24 * 60 * 60 * 1000;

    let cleanedCount = 0;

    for (const job of [...completed, ...failed]) {
      if (job.timestamp < cutoffDate) {
        await job.remove();
        cleanedCount++;
      }
    }

    logger.info(`Cleaned up ${cleanedCount} old jobs`);
    return cleanedCount;
  } catch (error) {
    logger.error("Error cleaning up jobs:", error);
    throw error;
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  try {
  if (worker) await worker.close();
    await syncEndOfDayQueue.close();
    await redis.disconnect();
    logger.info("End-of-day sync worker shutdown complete");
  } catch (error) {
    logger.error("Error during shutdown:", error);
  }
}

// Handle process termination
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

module.exports = {
  queueEndOfDaySync,
  getJobStatus,
  getQueueStats,
  cleanupCompletedJobs,
  shutdown,
  initializeWorker, // Export for testing
};
