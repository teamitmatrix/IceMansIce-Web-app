const express = require("express");
const { requireAuth, authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const driverController = require("../controllers/driverController");
const commonControllers = require("../controllers/commonControllers");
const { getDAL } = require("../dal");
const router = express.Router();

const dal = getDAL();
// Apply authentication and role-based access control
router.use(requireAuth);
router.use(requireRole(["driver"]));

// Driver Session Management
router.post("/session/start", driverController.startSession);
router.post("/session/end", driverController.endSession);
router.put("/session/location", driverController.updateLocation);

// Customer Management
router.get("/customers/search", driverController.searchCustomers);
router.post("/customers", driverController.createCustomer);
router.get("/customers/:customerId", driverController.getCustomerDetails);

// Product Management
router.get("/products", driverController.getProducts);

// Order Management
router.post("/orders", driverController.createOrder);
router.get("/orders", driverController.listOrders); // NEW list endpoint
router.get("/orders/:orderId", driverController.getOrderDetails);

// Invoice Management
router.post("/invoices", driverController.generateInvoice);
router.get("/invoices", driverController.listInvoices); // NEW list endpoint
router.get("/invoices/:invoiceId", driverController.getInvoiceDetails);
router.put("/invoices/:invoiceId", driverController.updateInvoice);
router.put("/invoices/:invoiceId/print", driverController.markInvoicePrinted);
router.put("/invoices/:invoiceId/mark-paid", driverController.markInvoiceAsPaid);

// Payment Processing
router.post("/payments", driverController.processPayment);

// Dashboard
router.get("/dashboard", driverController.getDashboard);

// Update driver info
router.put("/:id",driverController.updateDriver)

// update order
router.put(
  "/order/:id",
  commonControllers.updateOrder
);

// generate invoice

router.post(
  "/invoice",
  commonControllers.createInvoiceForOrder
);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Driver
 *   description: Driver portal API endpoints
 * 
 * components:
 *   schemas:
 *     DriverSession:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         driverId:
 *           type: string
 *         deviceId:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, inactive, on_route, break]
 *         location:
 *           type: object
 *           properties:
 *             latitude: { type: number }
 *             longitude: { type: number }
 *             accuracy: { type: number }
 *             timestamp: { type: string, format: date-time }
 *         totalOrdersProcessed:
 *           type: number
 *         totalAmountCollected:
 *           type: number
 * 
 * /api/driver/session/start:
 *   post:
 *     summary: Start driver session
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *             properties:
 *               deviceId:
 *                 type: string
 *               deviceInfo:
 *                 type: object
 *                 properties:
 *                   type: { type: string, enum: [mobile, tablet, desktop] }
 *                   model: { type: string }
 *                   os: { type: string }
 *                   browser: { type: string }
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude: { type: number }
 *                   longitude: { type: number }
 *                   accuracy: { type: number }
 *     responses:
 *       201:
 *         description: Session started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 session: { $ref: '#/components/schemas/DriverSession' }
 * 
 * /api/driver/customers/search:
 *   get:
 *     summary: Search customers
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: term
 *         required: true
 *         schema: { type: string, minLength: 2 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200:
 *         description: List of matching customers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Customer'
 *                 count: { type: integer }
 * 
 * /api/driver/orders:
 *   post:
 *     summary: Create new order
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - items
 *               - paymentMethod
 *             properties:
 *               customerId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productName, quantity, unitPrice]
 *                   properties:
 *                     productName: { type: string }
 *                     sku: { type: string }
 *                     quantity: { type: number, minimum: 1 }
 *                     unitPrice: { type: number, minimum: 0 }
 *                     discount: { type: number, minimum: 0, default: 0 }
 *                     taxRate: { type: number, minimum: 0, maximum: 1, default: 0 }
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, online, check, credit_card, charge_account]
 *               isPaidOnDelivery:
 *                 type: boolean
 *                 default: false
 *               specialInstructions:
 *                 type: string
 *                 maxLength: 1000
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude: { type: number }
 *                   longitude: { type: number }
 *     responses:
 *       201:
 *         description: Order created successfully
 * 
 * /api/driver/invoices:
 *   post:
 *     summary: Generate invoice from order
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *               paymentTerms:
 *                 type: string
 *                 enum: [immediate, net15, net30, net60]
 *                 default: immediate
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: Invoice generated successfully
 * 
 * /api/driver/payments:
 *   post:
 *     summary: Process payment
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceId
 *               - amount
 *               - method
 *             properties:
 *               invoiceId:
 *                 type: string
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               method:
 *                 type: string
 *                 enum: [cash, check, credit_card, debit_card, charge_account]
 *               reference:
 *                 type: string
 *               checkNumber:
 *                 type: string
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude: { type: number }
 *                   longitude: { type: number }
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Payment processed successfully
 * 
 * /api/driver/dashboard:
 *   get:
 *     summary: Get driver dashboard data
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     ordersToday: { type: number }
 *                     paymentsToday: { type: number }
 *                     totalCollectedToday: { type: number }
 *                     pendingInvoices: { type: number }
 *                     sessionActive: { type: boolean }
 *                 session: { $ref: '#/components/schemas/DriverSession' }
 *                 recentOrders:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/SalesOrder' }
 *                 recentPayments:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Payment' }
 *                 pendingInvoices:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Invoice' }
 */