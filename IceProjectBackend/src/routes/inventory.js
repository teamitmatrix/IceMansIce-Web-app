const express = require("express");
const Joi = require("joi");

const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { getDAL } = require("../dal");
const logger = require("../utils/logger");

const router = express.Router();


const createMovementSchema = Joi.object({
  productId: Joi.string().required(),
  delta: Joi.number().required().messages({
    "any.required": "Delta is required",
  }),
  reason: Joi.string()
    .valid(
      "purchase",
      "sale",
      "adjustment",
      "transfer",
      "damage",
      "expiry",
      "return",
      "correction",
      "initial_stock",
      "cycle_count"
    )
    .required(),

  // Reference (required)
  referenceType: Joi.string()
    .valid("sales_order", "invoice", "purchase_order", "transfer", "adjustment")
    .required(),
  referenceId: Joi.string().optional(),

  // Location (optional depending on type)
  warehouseId: Joi.string().optional(),
  truckId: Joi.string().optional(),

  // Quantities
  quantityBefore: Joi.number().min(0).required(),
  quantityAfter: Joi.number().min(0).required(),

  // User performing the action
  performedBy: Joi.string().required(),

  // Notes
  notes: Joi.string().max(500).optional(),
});


const createWarehouseSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  code: Joi.string().min(2).max(20).required(),
  address: Joi.object({
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    country: Joi.string().optional(),
  }).optional(),
  isActive: Joi.boolean().default(true),
});

const createTruckSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  code: Joi.string().min(2).max(20).required(),
  driverId: Joi.string().optional(),
  capacity: Joi.number().min(0).optional(),
  isActive: Joi.boolean().default(true),
});

/**
 * @swagger
 * /inventory/movements:
 *   get:
 *     summary: Get inventory movements with optional filtering
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: Filter by product ID
 *       - in: query
 *         name: warehouseId
 *         schema:
 *           type: string
 *         description: Filter by warehouse ID
 *       - in: query
 *         name: truckId
 *         schema:
 *           type: string
 *         description: Filter by truck ID
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *         description: Filter by movement reason
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter movements from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter movements to date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of inventory movements
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/movements",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Driver", "Accountant"]),
  async (req, res, next) => {
    try {
      const {
        productId,
        warehouseId,
        truckId,
        reason,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
      } = req.query;

      const dal = getDAL();
      const result = await dal.listInventoryMovements({
        productId,
        warehouseId,
        truckId,
        reason,
        dateFrom,
        dateTo,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({
        movements: result.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
          pages: Math.ceil(result.total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /inventory/movements:
 *   post:
 *     summary: Create inventory movement
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - delta
 *               - reason
 *               - referenceType
 *               - quantityBefore
 *               - quantityAfter
 *               - performedBy
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID of the product
 *               delta:
 *                 type: number
 *                 description: Positive for stock in, negative for stock out
 *               reason:
 *                 type: string
 *                 enum: [purchase, sale, adjustment, transfer, damage, expiry, return, correction, initial_stock, cycle_count]
 *               referenceType:
 *                 type: string
 *                 enum: [sales_order, invoice, purchase_order, transfer, adjustment]
 *                 description: Related business document type
 *               referenceId:
 *                 type: string
 *                 description: ID of related sales order, invoice, purchase order, etc.
 *               warehouseId:
 *                 type: string
 *                 description: ID of warehouse (required if locationType = warehouse)
 *               truckId:
 *                 type: string
 *                 description: ID of truck (required if locationType = truck)
 *               quantityBefore:
 *                 type: number
 *                 description: Stock quantity before movement
 *                 minimum: 0
 *               quantityAfter:
 *                 type: number
 *                 description: Stock quantity after movement
 *                 minimum: 0
 *               performedBy:
 *                 type: string
 *                 description: User ID who performed the movement
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Inventory movement created successfully
 *       400:
 *         description: Validation error or insufficient stock
 *       404:
 *         description: Product not found
 */

router.post(
  "/movements",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Driver"]),
  async (req, res, next) => {
    try {
      const { error, value } = createMovementSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const result = await dal.createInventoryMovement({
        ...value,
        createdBy: req.user.userId,
      });

      logger.info("Inventory movement created", {
        movementId: result.movement?.id,
        productId: result.movement?.productId,
        delta: result.movement?.delta,
        reason: result.movement?.reason,
        createdBy: req.user.userId,
      });

      res.status(201).json({
        message: "Inventory movement created successfully",
        movement: result.movement,
        newStock: result.newStock,
      });
    } catch (error) {
      if (
        error.message === "Insufficient stock" ||
        error.message === "Product not found"
      ) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * @swagger
 * /inventory/warehouses:
 *   get:
 *     summary: Get all warehouses
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of warehouses
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/warehouses",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Driver", "Accountant"]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
      const warehouses = await dal.listWarehouses();

      res.json({ warehouses });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /inventory/warehouses:
 *   post:
 *     summary: Create a new warehouse
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               code:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 20
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *                   country:
 *                     type: string
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Warehouse created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Warehouse code already exists
 */
router.post(
  "/warehouses",
  requireAuth,
  requireRole(["Admin"]),
  async (req, res, next) => {
    try {
      const { error, value } = createWarehouseSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const warehouse = await dal.createWarehouse(value);

      logger.info("Warehouse created", {
        warehouseId: warehouse.id,
        code: warehouse.code,
        createdBy: req.user.userId,
      });

      res.status(201).json({
        message: "Warehouse created successfully",
        warehouse,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /inventory/trucks:
 *   get:
 *     summary: Get all trucks
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of trucks
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/trucks",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Driver", "Accountant"]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
      const trucks = await dal.listTrucks();

      res.json({ trucks });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /inventory/trucks:
 *   post:
 *     summary: Create a new truck
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               code:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 20
 *               driverId:
 *                 type: string
 *               capacity:
 *                 type: number
 *                 minimum: 0
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Truck created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Truck code already exists
 */
router.post(
  "/trucks",
  requireAuth,
  requireRole(["Admin"]),
  async (req, res, next) => {
    try {
      const { error, value } = createTruckSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const truck = await dal.createTruck(value);

      logger.info("Truck created", {
        truckId: truck.id,
        code: truck.code,
        createdBy: req.user.userId,
      });

      res.status(201).json({
        message: "Truck created successfully",
        truck,
      });
    } catch (error) {
      next(error);
    }
  }
);



/**
  * @swagger
  * /inventory/stock/{movementId}:
  *   get:
  *     summary: Get stock level for a specific product
  *     tags: [Inventory]
  *     security:
  *       - bearerAuth: []
  *     parameters:
  *       - in: path
  *         name: movementId
  *         required: true
  *         schema:
  *           type: string
  *         description: Product ID
  *     responses:
  *       200:
  *         description: Product stock information
  *       404:
  *         description: Product not found
 */
router.get(
  "/stock/:productId",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Driver", "Accountant"]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
  const product = await dal.getProductById(req.params.productId);

      if (!product) {
        return res.status(404).json({
          error: "Product not found",
          message: "Product with the specified ID does not exist",
        });
      }

      const movements = await dal.findMovementsByProduct(req.params.productId, {
        limit: 10,
      });

      res.json({
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          currentStock: typeof product.quantity === 'number' ? product.quantity : 0,
        },
        recentMovements: movements.movements,
      });
    } catch (error) {
      next(error);
    }
  }
);



module.exports = router;
