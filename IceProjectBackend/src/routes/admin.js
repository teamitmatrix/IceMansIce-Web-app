
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { requireRole } = require("../middleware/rbac");
const { authenticate } = require("../middleware/auth");

// Reset invoice sequence (admin only)
router.post(
  "/invoice-sequence/reset",
  authenticate,
  requireRole(["admin"]),
  adminController.resetInvoiceSequence
);

/**
 * @swagger
 * /admin/reports/daily-sales:
 *   get:
 *     summary: Get daily sales report
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for the report (YYYY-MM-DD)
 *       - in: query
 *         name: warehouseId
 *         schema:
 *           type: string
 *         description: Filter by warehouse
 *     responses:
 *       200:
 *         description: Daily sales report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date:
 *                   type: string
 *                   format: date
 *                 totalSales:
 *                   type: number
 *                 totalOrders:
 *                   type: number
 *                 salesByItem:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                       productName:
 *                         type: string
 *                       quantity:
 *                         type: number
 *                       revenue:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 */
router.get(
  "/reports/daily-sales",
  authenticate,
  requireRole(["admin", "accountant"]),
  adminController.getDailySalesReport
);

/**
 * @swagger
 * /admin/reports/collections:
 *   get:
 *     summary: Get collections report
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report
 *     responses:
 *       200:
 *         description: Collections report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date
 *                     endDate:
 *                       type: string
 *                       format: date
 *                 totalCollected:
 *                   type: number
 *                 paymentsByMethod:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       method:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       count:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 */
router.get(
  "/reports/collections",
  authenticate,
  requireRole(["admin", "accountant"]),
  adminController.getCollectionsReport
);

/**
 * @swagger
 * /admin/reports/aging-accounts:
 *   get:
 *     summary: Get aging accounts report
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aging accounts report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalOutstanding:
 *                   type: number
 *                 agingBuckets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       range:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       customerCount:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 */
router.get(
  "/reports/aging-accounts",
  authenticate,
  requireRole(["admin", "accountant"]),
  adminController.getAgingAccountsReport
);

/**
 * @swagger
 * /admin/reports/route-performance:
 *   get:
 *     summary: Get route performance report
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report
 *       - in: query
 *         name: driverId
 *         schema:
 *           type: string
 *         description: Filter by specific driver
 *     responses:
 *       200:
 *         description: Route performance report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date
 *                     endDate:
 *                       type: string
 *                       format: date
 *                 routesCompleted:
 *                   type: number
 *                 totalStops:
 *                   type: number
 *                 averageStopsPerRoute:
 *                   type: number
 *                 performanceByDriver:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       driverId:
 *                         type: string
 *                       driverName:
 *                         type: string
 *                       routesCompleted:
 *                         type: number
 *                       totalStops:
 *                         type: number
 *                       averageStopsPerRoute:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 */
router.get(
  "/reports/route-performance",
  authenticate,
  requireRole(["admin", "accountant"]),
  adminController.getRoutePerformanceReport
);

/**
 * @swagger
 * /admin/reports/sales-by-item:
 *   get:
 *     summary: Get sales by item report
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report
 *     responses:
 *       200:
 *         description: Sales by item report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date
 *                     endDate:
 *                       type: string
 *                       format: date
 *                 totalRevenue:
 *                   type: number
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                       productName:
 *                         type: string
 *                       sku:
 *                         type: string
 *                       quantitySold:
 *                         type: number
 *                       revenue:
 *                         type: number
 *                       averagePrice:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 */
router.get(
  "/reports/sales-by-item",
  authenticate,
  requireRole(["admin", "accountant"]),
  adminController.getSalesByItemReport
);

/**
 * @swagger
 * /admin/system/health:
 *   get:
 *     summary: Get system health status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     responseTime:
 *                       type: number
 *                 redis:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     responseTime:
 *                       type: number
 *                 quickbooks:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     lastSync:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 */
router.get(
  "/system/health",
  authenticate,
  requireRole(["admin"]),
  adminController.getSystemHealth
);

// Admin management routes
router.post(
  "/users/add-admin",
  authenticate,
  requireRole(["admin"]),
  adminController.addAdmin
);

// General user management CRUD
router.post(
  "/users",
  authenticate,
  requireRole(["admin"]),
  adminController.createUser
);

router.put(
  "/users/:id",
  authenticate,
  requireRole(["admin"]),
  adminController.updateUser
);

router.delete(
  "/users/:id",
  authenticate,
  requireRole(["admin"]),
  adminController.deleteUser
);

// Bulk delete users
router.post(
  "/users/bulk-delete",
  authenticate,
  requireRole(["admin"]),
  adminController.bulkDeleteUsers
);

router.get(
  "/users",
  authenticate,
  requireRole(["admin"]),
  adminController.getUsers
);

router.get(
  "/customers",
  authenticate,
  requireRole(["admin"]),
  adminController.getCustomers
);

router.get(
  "/drivers",
  authenticate,
  requireRole(["admin"]),
  adminController.getDrivers
);

// Product management routes
router.get(
  "/products",
  authenticate,
  requireRole(["admin"]),
  adminController.getProducts
);

router.post(
  "/products",
  authenticate,
  requireRole(["admin"]),
  adminController.addProduct
);

router.put(
  "/products/:id",
  authenticate,
  requireRole(["admin"]),
  adminController.updateProduct
);

router.delete(
  "/products/:id",
  authenticate,
  requireRole(["admin"]),
  adminController.deleteProduct
);

// Order and Invoice management routes
router.get(
  "/orders",
  authenticate,
  requireRole(["admin"]),
  adminController.getOrders
);

router.get(
  "/invoices",
  authenticate,
  requireRole(["admin"]),
  adminController.getInvoices
);

// Dashboard and export routes
router.get(
  "/dashboard/stats",
  authenticate,
  requireRole(["admin"]),
  adminController.getDashboardStats
);

router.get(
  "/export",
  authenticate,
  requireRole(["admin"]),
  adminController.exportData
);

// update order
router.put(
  "/order/:id",
  authenticate,
  requireRole(["admin"]),
  adminController.updateOrder
);

// generate invoice

router.post(
  "/invoice",
  authenticate,
  requireRole(["admin"]),
  adminController.createInvoiceForOrder
);

router.put(
  "/invoice/:id",
  authenticate,
  requireRole(["admin"]),
  adminController.updateInvoice
);

// Mark invoice as printed (admin action)
router.put(
  "/invoice/:id/print",
  authenticate,
  requireRole(["admin"]),
  adminController.markInvoicePrinted
);

module.exports = router;
