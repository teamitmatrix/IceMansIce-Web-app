const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');
const qboService = require('../services/quickbooksService');
const { getDAL } = require('../dal');
const QuickBooksConnection = require('../models/QuickBooksConnection');

class ScheduledSyncService {
  constructor() {
    this.isRunning = false;
    this.lastSyncTime = null;
    this.cronTasks = []; // Store cron task references
  }

  /**
   * Start the scheduled sync service
   */
  start() {
    logger.info('Starting scheduled sync service...');

    // Run sync every day at 2 AM UTC
    const dailySyncTask = cron.schedule('0 2 * * *', async () => {
      await this.runDailySync();
    }, {
      scheduled: true,
      timezone: "UTC"
    });
    
    this.cronTasks.push(dailySyncTask);

    // Optional: Run sync every 6 hours for more frequent updates
    // Uncomment if you want more frequent syncing
    // const frequentSyncTask = cron.schedule('0 */6 * * *', async () => {
    //   await this.runFrequentSync();
    // }, {
    //   scheduled: true,
    //   timezone: "UTC"
    // });
    // this.cronTasks.push(frequentSyncTask);

    logger.info('Scheduled sync service started - Daily sync at 2 AM UTC');
  }

  /**
   * Run daily sync for all active QuickBooks connections
   */
  async runDailySync() {
    if (this.isRunning) {
      logger.warn('Daily sync already running, skipping...');
      return;
    }

    this.isRunning = true;
    logger.info('Starting daily QuickBooks sync...');

    try {
      // Get all active QuickBooks connections
      const connections = await QuickBooksConnection.find({ isActive: true });
      
      if (connections.length === 0) {
        logger.info('No active QuickBooks connections found for sync');
        return;
      }

      logger.info(`Found ${connections.length} active QuickBooks connections`);

      const dal = getDAL();
      let totalSuccess = 0;
      let totalErrors = 0;

      // Sync each connection
      for (const connection of connections) {
        try {
          logger.info(`Syncing QuickBooks connection for user: ${connection.userId}`);

          // Sync customers from QuickBooks
          const customerResult = await qboService.syncCustomersFromQbo(connection.userId, dal);
          logger.info(`Customer sync completed for user ${connection.userId}:`, {
            fetched: customerResult.fetched,
            created: customerResult.created,
            updated: customerResult.updated,
            errors: customerResult.errors.length
          });

          // Sync invoices from QuickBooks
          const invoiceResult = await qboService.syncInvoicesFromQbo(connection.userId, dal);
          logger.info(`Invoice sync completed for user ${connection.userId}:`, {
            fetched: invoiceResult.fetched,
            created: invoiceResult.created,
            updated: invoiceResult.updated,
            errors: invoiceResult.errors.length
          });

          // Sync customers to QuickBooks (push local changes)
          const pushCustomerResult = await qboService.syncCustomersToQbo(connection.userId, dal);
          logger.info(`Customer push completed for user ${connection.userId}:`, {
            synced: pushCustomerResult.syncedCount,
            errors: pushCustomerResult.errorCount
          });

          // Sync invoices to QuickBooks (push local changes)
          const pushInvoiceResult = await qboService.syncInvoicesToQbo(connection.userId, dal);
          logger.info(`Invoice push completed for user ${connection.userId}:`, {
            synced: pushInvoiceResult.synced,
            errors: pushInvoiceResult.errors
          });

          totalSuccess++;

        } catch (error) {
          totalErrors++;
          logger.error(`Sync failed for user ${connection.userId}:`, {
            error: error.message,
            stack: error.stack
          });

          // Record sync history with error
          await qboService.recordSyncHistory(
            connection.userId, 
            'daily_sync', 
            'failed', 
            0, 
            error.message
          );
        }
      }

      this.lastSyncTime = new Date();
      logger.info('Daily QuickBooks sync completed', {
        totalConnections: connections.length,
        successful: totalSuccess,
        errors: totalErrors,
        completedAt: this.lastSyncTime
      });

    } catch (error) {
      logger.error('Daily sync service error:', {
        error: error.message,
        stack: error.stack
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run frequent sync (every 6 hours) - optional
   */
  async runFrequentSync() {
    if (this.isRunning) {
      logger.warn('Frequent sync already running, skipping...');
      return;
    }

    this.isRunning = true;
    logger.info('Starting frequent QuickBooks sync...');

    try {
      // Get all active QuickBooks connections
      const connections = await QuickBooksConnection.find({ isActive: true });
      
      if (connections.length === 0) {
        logger.info('No active QuickBooks connections found for frequent sync');
        return;
      }

      const dal = getDAL();

      // Only sync customers and invoices from QuickBooks (pull changes)
      // Skip pushing to avoid conflicts with frequent updates
      for (const connection of connections) {
        try {
          logger.info(`Frequent sync for user: ${connection.userId}`);

          // Sync customers from QuickBooks
          await qboService.syncCustomersFromQbo(connection.userId, dal);
          
          // Sync invoices from QuickBooks
          await qboService.syncInvoicesFromQbo(connection.userId, dal);

          logger.info(`Frequent sync completed for user ${connection.userId}`);

        } catch (error) {
          logger.error(`Frequent sync failed for user ${connection.userId}:`, {
            error: error.message
          });
        }
      }

      logger.info('Frequent QuickBooks sync completed');

    } catch (error) {
      logger.error('Frequent sync service error:', {
        error: error.message
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger sync for a specific user
   */
  async triggerSyncForUser(userId) {
    if (this.isRunning) {
      throw new Error('Sync is already running');
    }

    this.isRunning = true;
    logger.info(`Manual sync triggered for user: ${userId}`);

    try {
      const dal = getDAL();

      // Sync customers from QuickBooks
      const customerResult = await qboService.syncCustomersFromQbo(userId, dal);
      
      // Sync invoices from QuickBooks
      const invoiceResult = await qboService.syncInvoicesFromQbo(userId, dal);

      // Sync customers to QuickBooks
      const pushCustomerResult = await qboService.syncCustomersToQbo(userId, dal);

      // Sync invoices to QuickBooks
      const pushInvoiceResult = await qboService.syncInvoicesToQbo(userId, dal);

      logger.info(`Manual sync completed for user ${userId}`, {
        customers: { fetched: customerResult.fetched, created: customerResult.created, updated: customerResult.updated },
        invoices: { fetched: invoiceResult.fetched, created: invoiceResult.created, updated: invoiceResult.updated },
        pushCustomers: { synced: pushCustomerResult.syncedCount, errors: pushCustomerResult.errorCount },
        pushInvoices: { synced: pushInvoiceResult.synced, errors: pushInvoiceResult.errors }
      });

      return {
        success: true,
        customers: customerResult,
        invoices: invoiceResult,
        pushCustomers: pushCustomerResult,
        pushInvoices: pushInvoiceResult
      };

    } catch (error) {
      logger.error(`Manual sync failed for user ${userId}:`, {
        error: error.message
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      nextScheduledSync: this.getNextScheduledSync()
    };
  }

  /**
   * Get next scheduled sync time
   */
  getNextScheduledSync() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(2, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Stop the scheduled sync service
   */
  stop() {
    logger.info('Stopping scheduled sync service...');
    
    // Stop all cron tasks
    this.cronTasks.forEach(task => {
      if (task && typeof task.stop === 'function') {
        task.stop();
      }
    });
    
    this.cronTasks = [];
    logger.info('Scheduled sync service stopped successfully');
  }
}

// Create singleton instance
const scheduledSyncService = new ScheduledSyncService();

module.exports = scheduledSyncService;
