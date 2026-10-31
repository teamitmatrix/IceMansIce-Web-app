const { Queue, Worker } = require("bullmq");
const Redis = require("ioredis");
const config = require("../config");
const logger = require("../utils/logger");
const qboService = require("../services/quickbooksService");
const { getDAL } = require("../dal");

// Redis connection
if (!config.queues.enabled) {
  module.exports = {
    queueSync: async () => {
      throw new Error("Queues are disabled (QUEUES_ENABLED=false)");
    },
    getJobStatus: async () => null,
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

// Queue
const qboSyncQueue = new Queue("qbo-sync", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 2,
    backoff: { type: "exponential", delay: 1500 },
  },
});

async function queueSync(type, userId, options = {}) {
  if (!["customers", "invoices"].includes(type)) {
    throw new Error("Invalid sync type");
  }

  const job = await qboSyncQueue.add(
    `sync-${type}`,
    { type, userId, options, queuedAt: new Date() },
    { priority: type === "customers" ? 2 : 1 }
  );

  return { jobId: job.id, status: "queued" };
}

async function getJobStatus(jobId) {
  const job = await qboSyncQueue.getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  const progress = await job.progress;
  return {
    jobId: job.id,
    status: state,
    progress,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
    createdAt: job.timestamp,
    processedAt: job.processedOn,
    finishedAt: job.finishedOn,
  };
}

// Worker - Initialize lazily to avoid startup crashes
let worker = null;
let workerInitialized = false;

async function initializeWorker() {
  if (workerInitialized || worker) {
    return worker;
  }

  try {
    worker = new Worker(
      "qbo-sync",
      async (job) => {
        const { type, userId, options = {} } = job.data;
        const dal = getDAL();

        logger.info(`Starting QBO sync job: ${type}`, { 
          jobId: job.id, 
          userId,
          options
        });

        await job.updateProgress(5);

        try {
          if (type === "customers") {
            // Import customers from QBO into local DB
            await job.updateProgress(10);
            const result = await qboService.syncCustomersFromQbo(userId, dal, options);
            await job.updateProgress(100);
            return result;
          }

          if (type === "invoices") {
            await job.updateProgress(10);
            const result = await qboService.syncInvoicesFromQbo(userId, dal, options);
            await job.updateProgress(100);
            return result;
          }

          throw new Error("Unknown job type");
        } catch (error) {
          // Enhanced error handling for SSL/TLS issues with retry logic
          if (error.code === 'ERR_SSL_WRONG_VERSION_NUMBER' || 
              error.message?.includes('SSL routines') ||
              error.message?.includes('wrong version number') ||
              error.message?.includes('ECONNRESET') ||
              error.message?.includes('socket hang up')) {
            
            logger.error(`QBO sync job ${job.id} failed due to SSL/TLS issue`, {
              type,
              userId,
              error: error.message,
              code: error.code,
              suggestion: "This may be due to SSL/TLS configuration or network issues. Retrying with exponential backoff."
            });
            
            // Record sync history with SSL error
            await qboService.recordSyncHistory(userId, type, 'failed', 0, `SSL/TLS Error: ${error.message}`);
            
            // For SSL errors, we should throw a specific error that can be retried
            const sslError = new Error(`SSL/TLS connection error: ${error.message}`);
            sslError.code = 'SSL_CONNECTION_ERROR';
            sslError.retryable = true;
            throw sslError;
          }
          
          // Log other errors normally
          logger.error(`QBO sync job ${job.id} failed`, {
            type,
            userId,
            error: error.message,
            stack: error.stack
          });
          
          throw error;
        }
      },
      { 
        connection: redis, 
        concurrency: 1,
        // Enhanced retry configuration for SSL errors and network issues
        settings: {
          stalledInterval: 30 * 1000,
          maxStalledCount: 1,
        },
        // Add job options for better retry handling
        jobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2 seconds, then 4, then 8
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        }
      }
    );

    // Set up event handlers
    worker.on("completed", (job, result) => {
      console.log("QBO sync job completed ===>", job, result);
      logger.info(`QBO sync job ${job.id} completed`, { type: job.name, result });
    });
    
    worker.on("failed", (job, err) => {
      console.log("QBO sync job failed ===>", job, err);
      logger.error(`QBO sync job ${job?.id} failed`, { error: err?.message });
    });
    
    worker.on("error", (err) => {
      console.log("QBO sync worker error ===>", err);
      logger.error("QBO sync worker error ===>", err);
    });

    workerInitialized = true;
    logger.info("QBO sync worker initialized successfully");
    return worker;
  } catch (err) {
    logger.error("QBO sync worker initialization failed", { error: err.message });
    worker = null;
    workerInitialized = false;
    throw err;
  }
}

// Update queueSync to initialize worker when needed
async function queueSyncWithWorker(type, userId, options = {}) {
  if (!["customers", "invoices"].includes(type)) {
    throw new Error("Invalid sync type");
  }

  try {
    // Initialize worker if not already done
    await initializeWorker();
    
    const job = await qboSyncQueue.add(
      `sync-${type}`,
      { type, userId, options, queuedAt: new Date() },
      { priority: type === "customers" ? 2 : 1 }
    );

    return { jobId: job.id, status: "queued" };
  } catch (error) {
    logger.error("Failed to queue sync job", { type, userId, error: error.message });
    throw error;
  }
}

async function shutdown() {
  try {
    if (worker) await worker.close();
    await qboSyncQueue.close();
    await redis.disconnect();
  } catch (e) {
    console.log("Error shutting down qbo-sync worker ===>", e);
    logger.error("Error shutting down qbo-sync worker", { error: e.message });
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

module.exports = { 
  queueSync: queueSyncWithWorker, 
  getJobStatus,
  initializeWorker // Export for testing
};
