const logger = require("../utils/logger");
const db = require("../db/db");
const Redis = require("ioredis");
const config = require("../config");
const MongoDAL = require("../dal/MongoDAL");
const dal = new MongoDAL();
/**
 * Generate daily sales report
 */
async function generateDailySalesReport(date, warehouseId) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get sales orders for the date
    const { data: orders } = await dal.listSalesOrders({
      startDate: startOfDay,
      endDate: endOfDay,
      warehouseId,
      status: "completed",
    });

    // Calculate totals
    const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;

    // Group sales by item
    const salesByItem = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (!salesByItem[item.productId]) {
          salesByItem[item.productId] = {
            productId: item.productId,
            productName: item.productName || "Unknown Product",
            quantity: 0,
            revenue: 0,
          };
        }
        salesByItem[item.productId].quantity += item.quantity;
        salesByItem[item.productId].revenue += item.quantity * item.unitPrice;
      });
    });

    return {
      date,
      totalSales,
      totalOrders,
      salesByItem: Object.values(salesByItem),
    };
  } catch (error) {
    logger.error("Error generating daily sales report:", error);
    throw error;
  }
}

/**
 * Generate collections report
 */
async function generateCollectionsReport(startDate, endDate) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get payments for the period
    const payments = await dal.listPayments({
      startDate: start,
      endDate: end,
    });

    // Calculate totals
    const totalCollected = payments.data?.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    // Group by payment method
    const paymentsByMethod = {};
    payments.data?.forEach((payment) => {
      if (!paymentsByMethod[payment.method]) {
        paymentsByMethod[payment.method] = {
          method: payment.method,
          amount: 0,
          count: 0,
        };
      }
      paymentsByMethod[payment.method].amount += payment.amount;
      paymentsByMethod[payment.method].count += 1;
    });

    return {
      period: { startDate, endDate },
      totalCollected,
      paymentsByMethod: Object.values(paymentsByMethod),
    };
  } catch (error) {
    logger.error("Error generating collections report:", error);
    throw error;
  }
}

/**
 * Generate aging accounts report
 */
async function generateAgingAccountsReport() {
  try {
    // Get all customers with outstanding balances
    const customers = await dal.listCustomers({ hasOutstandingBalance: true });

    let totalOutstanding = 0;
    const agingBuckets = {
      "0-30": { range: "0-30 days", amount: 0, customerCount: 0 },
      "31-60": { range: "31-60 days", amount: 0, customerCount: 0 },
      "61-90": { range: "61-90 days", amount: 0, customerCount: 0 },
      "91+": { range: "91+ days", amount: 0, customerCount: 0 },
    };

    customers.data?.forEach((customer) => {
      if (customer.balance > 0) {
        totalOutstanding += customer.balance;

        // Calculate days since last payment or invoice
        const lastActivity =
          customer.lastPaymentDate || customer.lastInvoiceDate;
        if (lastActivity) {
          const daysSince = Math.floor(
            (new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24)
          );

          if (daysSince <= 30) {
            agingBuckets["0-30"].amount += customer.balance;
            agingBuckets["0-30"].customerCount += 1;
          } else if (daysSince <= 60) {
            agingBuckets["31-60"].amount += customer.balance;
            agingBuckets["31-60"].customerCount += 1;
          } else if (daysSince <= 90) {
            agingBuckets["61-90"].amount += customer.balance;
            agingBuckets["61-90"].customerCount += 1;
          } else {
            agingBuckets["91+"].amount += customer.balance;
            agingBuckets["91+"].customerCount += 1;
          }
        }
      }
    });

    return {
      totalOutstanding,
      agingBuckets: Object.values(agingBuckets),
    };
  } catch (error) {
    logger.error("Error generating aging accounts report:", error);
    throw error;
  }
}

/**
 * Generate route performance report
 */
async function generateRoutePerformanceReport(startDate, endDate, driverId) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get routes for the period
    const routes = await dal.listRoutes({
      startDate: start,
      endDate: end,
      driverId,
      status: "completed",
    });

    const routesCompleted = routes.length;
    const totalStops = routes.data?.reduce(
      (sum, route) => sum + route.stops.length,
      0
    );
    const averageStopsPerRoute =
      routesCompleted > 0 ? totalStops / routesCompleted : 0;

    // Group by driver
    const performanceByDriver = {};
    routes.data?.forEach((route) => {
      const driver = route.driverId;
      if (!performanceByDriver[driver]) {
        performanceByDriver[driver] = {
          driverId: driver,
          driverName: route.driverName || "Unknown Driver",
          routesCompleted: 0,
          totalStops: 0,
          averageStopsPerRoute: 0,
        };
      }
      performanceByDriver[driver].routesCompleted += 1;
      performanceByDriver[driver].totalStops += route.stops.length;
    });

    // Calculate averages for each driver
    Object.values(performanceByDriver).forEach((driver) => {
      driver.averageStopsPerRoute =
        driver.routesCompleted > 0
          ? driver.totalStops / driver.routesCompleted
          : 0;
    });

    return {
      period: { startDate, endDate },
      routesCompleted,
      totalStops,
      averageStopsPerRoute,
      performanceByDriver: Object.values(performanceByDriver),
    };
  } catch (error) {
    logger.error("Error generating route performance report:", error);
    throw error;
  }
}

/**
 * Generate sales by item report
 */
async function generateSalesByItemReport(startDate, endDate, category) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get completed sales orders for the period
    const orders = await dal.listSalesOrders({
      startDate: start,
      endDate: end,
      status: "completed",
    });

    // Calculate totals
    const totalRevenue = orders.data?.reduce(
      (sum, order) => sum + order.total,
      0
    );

    // Group sales by item
    const items = {};
    orders.data?.forEach((order) => {
      order.items.forEach((item) => {
        if (!items[item.productId]) {
          items[item.productId] = {
            productId: item.productId,
            productName: item.productName || "Unknown Product",
            sku: item.sku || "N/A",
            quantitySold: 0,
            revenue: 0,
            averagePrice: 0,
          };
        }
        items[item.productId].quantitySold += item.quantity;
        items[item.productId].revenue += item.quantity * item.unitPrice;
      });
    });

    // Calculate average prices
    Object.values(items).forEach((item) => {
      item.averagePrice =
        item.quantitySold > 0 ? item.revenue / item.quantitySold : 0;
    });

    // Filter by category if specified
    let filteredItems = Object.values(items);
    if (category) {
      // This would require product category information in the product model
      // For now, return all items
      logger.info("Category filtering not yet implemented");
    }

    return {
      period: { startDate, endDate },
      totalRevenue,
      items: filteredItems,
    };
  } catch (error) {
    logger.error("Error generating sales by item report:", error);
    throw error;
  }
}

/**
 * Get system health status
 */
async function getSystemHealth() {
  try {
    const health = {
      status: "healthy",
      database: { status: "unknown", responseTime: 0 },
      redis: { status: "unknown", responseTime: 0 },
      quickbooks: { status: "unknown", lastSync: null },
    };

    // Check database health
    try {
      const startTime = Date.now();
      const isConnected = db.isConnected();
      const responseTime = Date.now() - startTime;

      health.database.status = isConnected ? "healthy" : "unhealthy";
      health.database.responseTime = responseTime;

      if (!isConnected) {
        health.status = "degraded";
      }
    } catch (error) {
      health.database.status = "error";
      health.status = "degraded";
    }

    // Check Redis health
    try {
      // Create Redis connection with SSL configuration for cloud platforms
      const redisOptions = { 
        // Enhanced SSL configuration for cloud platforms
        ...(config.redis.isCloudPlatform && {
          tls: config.redis.ssl,
          connectTimeout: 10000,
          lazyConnect: true,
        })
      };
      const redis = new Redis(config.redis.url, redisOptions);
      const startTime = Date.now();
      await redis.ping();
      const responseTime = Date.now() - startTime;

      health.redis.status = "healthy";
      health.redis.responseTime = responseTime;

      redis.disconnect();
    } catch (error) {
      health.redis.status = "error";
      health.status = "degraded";
    }

    // Check QuickBooks status (placeholder)
    try {
      // This would check the actual QBO connection status
      health.quickbooks.status = "unknown";
      health.quickbooks.lastSync = null;
    } catch (error) {
      health.quickbooks.status = "error";
      health.status = "degraded";
    }

    return health;
  } catch (error) {
    logger.error("Error checking system health:", error);
    return {
      status: "error",
      error: error.message,
    };
  }
}

/**
 * Get dashboard statistics
 */
async function getDashboardStats() {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const last30Days = new Date();
    last30Days.setDate(today.getDate() - 30);

    // Get today's stats
    const todayOrders = await dal.listSalesOrders({
      startDate: startOfDay,
      endDate: endOfDay,
    });

    const todaySales =
      todayOrders.data?.reduce((sum, order) => sum + order.total, 0) || 0;
    const todayOrdersCount = todayOrders.data?.length || 0;

    // Get this month's stats
    const thisMonthOrders = await dal.listSalesOrders({
      startDate: thisMonth,
      endDate: endOfDay,
    });

    const thisMonthSales =
      thisMonthOrders.data?.reduce((sum, order) => sum + order.total, 0) || 0;
    const thisMonthOrdersCount = thisMonthOrders.data?.length || 0;

    // Get last month's stats for comparison
    const lastMonthOrders = await dal.listSalesOrders({
      startDate: lastMonth,
      endDate: lastMonthEnd,
    });

    const lastMonthSales =
      lastMonthOrders.data?.reduce((sum, order) => sum + order.total, 0) || 0;

    // Get total counts
    const totalCustomers = await dal.countCustomers();
    const totalProducts = await dal.countProducts();
    const totalDrivers = await dal.countDrivers();
    const totalOrders = await dal.countSalesOrders();

    // Get pending orders count
    const pendingOrders = await dal.listSalesOrders({
      status: "pending",
    });
    const pendingOrdersCount = pendingOrders.data?.length || 0;

    // Get overdue invoices
    const overdueInvoices = await dal.getOverdueInvoices();
    const overdueCount = overdueInvoices.length;

    // Calculate growth percentages
    const salesGrowth =
      lastMonthSales > 0
        ? ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100
        : 0;

    const ordersGrowth =
      lastMonthOrders.data?.length > 0
        ? ((thisMonthOrdersCount - lastMonthOrders.data.length) /
            lastMonthOrders.data.length) *
          100
        : 0;

    // Last 30 days stats (based on entity creation/order dates)
    const last30 = {
      customers: await dal.countCustomersSince(last30Days),
      products: await dal.countProductsSince(last30Days),
      orders: await dal.countSalesOrdersSince(last30Days),
      revenue: await dal.sumSalesSince(last30Days),
    };

    return {
      today: {
        sales: todaySales,
        orders: todayOrdersCount,
      },
      thisMonth: {
        sales: thisMonthSales,
        orders: thisMonthOrdersCount,
        growth: {
          sales: salesGrowth,
          orders: ordersGrowth,
        },
      },
      totals: {
        customers: totalCustomers,
        products: totalProducts,
        drivers: totalDrivers,
        orders: totalOrders,
      },
      last30Days: last30,
      alerts: {
        pendingOrders: pendingOrdersCount,
        overdueInvoices: overdueCount,
      },
      lastUpdated: new Date(),
    };
  } catch (error) {
    logger.error("Error getting dashboard stats:", error);
    throw error;
  }
}

module.exports = {
  generateDailySalesReport,
  generateCollectionsReport,
  generateAgingAccountsReport,
  generateRoutePerformanceReport,
  generateSalesByItemReport,
  getSystemHealth,
  getDashboardStats,
};
