const express = require("express");
const Joi = require("joi");

const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { getDAL } = require("../dal");
const logger = require("../utils/logger");

const router = express.Router();

const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  sku: Joi.string().min(3).max(50).required(),
  description: Joi.string().max(1000).optional(),
  price: Joi.number().min(0).precision(2).required(),
  quantity: Joi.number().min(0).default(0),
  tax: Joi.number().min(0).max(1).default(0),
  unit: Joi.string().max(20).default("piece"),
  isActive: Joi.boolean().default(true),
  tags: Joi.array().items(Joi.string().max(30)).optional(),
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).optional(),
  sku: Joi.string().min(3).max(50).optional(),
  description: Joi.string().max(1000).optional(),
  price: Joi.number().min(0).precision(2).optional(),
  quantity: Joi.number().min(0).optional(),
  tax: Joi.number().min(0).max(1).optional(),
  unit: Joi.string().max(20).optional(),
  isActive: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string().max(30)).optional(),
});

const adjustStockSchema = Joi.object({
  delta: Joi.number().required(),
  reason: Joi.string().max(200).required(),
  warehouseId: Joi.string().optional(),
  truckId: Joi.string().optional(),
  notes: Joi.string().max(500).optional(),
});

router.get(
  "/",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Driver", "Accountant", "Customer"]),
  async (req, res, next) => {
    try {
  const { search, isActive, page = 1, limit = 20 } = req.query;

      const dal = getDAL();
      const result = await dal.listProducts({
        search,
        isActive: isActive !== undefined ? isActive === "true" : undefined,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      // Normalize output so clients can rely on `quantity` for stock level
      const products = (result.data || []).map((p) => {
        // Prefer explicit quantity if present; otherwise fall back to stock or virtual totalStock
        const base = typeof p.toJSON === "function" ? p.toJSON() : p;
        const q = typeof base.quantity === "number"
          ? base.quantity
          : (typeof base.stock === "number" ? base.stock : (typeof base.totalStock === "number" ? base.totalStock : 0));
        const taxPercent = typeof base.tax === "number"
          ? base.tax
          : (typeof base.taxRate === "number" ? base.taxRate * 100 : 0);
        return { ...base, quantity: q, tax: taxPercent };
      });

      res.json({
        products,
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

router.post(
  "/",
  requireAuth,
  requireRole(["Admin", "SalesRep"]),
  async (req, res, next) => {
    try {
      const { error, value } = createProductSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const product = await dal.createProduct(value);

      logger.info("Product created", {
        productId: product.id,
        sku: product.sku,
        createdBy: req.user.userId,
      });

      res.status(201).json({
        message: "Product created successfully",
        product,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Driver", "Accountant", "Customer"]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
  const product = await dal.getProductById(req.params.id);

      if (!product) {
        return res.status(404).json({
          error: "Product not found",
          message: "Product with the specified ID does not exist",
        });
      }

      // Add normalized quantity field
      const base = typeof product.toJSON === "function" ? product.toJSON() : product;
      const quantity = typeof base.quantity === "number"
        ? base.quantity
        : (typeof base.stock === "number" ? base.stock : (typeof base.totalStock === "number" ? base.totalStock : 0));
      const tax = typeof base.tax === "number" ? base.tax : (typeof base.taxRate === "number" ? base.taxRate * 100 : 0);
      res.json({ product: { ...base, quantity, tax } });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/:id",
  requireAuth,
  requireRole(["Admin", "SalesRep"]),
  async (req, res, next) => {
    try {
      const { error, value } = updateProductSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const product = await dal.updateProduct(req.params.id, value);

      if (!product) {
        return res.status(404).json({
          error: "Product not found",
          message: "Product with the specified ID does not exist",
        });
      }

      logger.info("Product updated", {
        productId: product.id,
        updatedBy: req.user.userId,
      });

      res.json({
        message: "Product updated successfully",
        product,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete("/:id", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
  try {
    const dal = getDAL();
    const deleted = await dal.deleteProduct(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: "Product not found",
        message: "Product with the specified ID does not exist",
      });
    }

    logger.info("Product deleted", {
      productId: req.params.id,
      deletedBy: req.user.userId,
    });

    res.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:id/stock",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Driver"]),
  async (req, res, next) => {
    try {
      const { error, value } = adjustStockSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const result = await dal.adjustProductStock(req.params.id, {
        ...value,
        adjustedBy: req.user.userId,
      });

      logger.info("Product stock adjusted", {
        productId: req.params.id,
        delta: value.delta,
        reason: value.reason,
        adjustedBy: req.user.userId,
      });

      res.json({
        message: "Stock adjusted successfully",
        newStock: result.newStock,
        movement: result.movement,
      });
    } catch (error) {
      if (error.message === "Insufficient stock") {
        return res.status(400).json({
          error: "Insufficient stock",
          message: error.message,
        });
      }
      next(error);
    }
  }
);

router.get(
  "/:id/movements",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Accountant"]),
  async (req, res, next) => {
    try {
      const { page = 1, limit = 20 } = req.query;

      const dal = getDAL();
      const product = await dal.getProductById(req.params.id);

      if (!product) {
        return res.status(404).json({
          error: "Product not found",
          message: "Product with the specified ID does not exist",
        });
      }

      const movements = await dal.getProductMovements(req.params.id, {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          currentStock: product.quantity,
        },
        movements: movements.movements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: movements.total,
          pages: Math.ceil(movements.total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;


/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - sku
 *         - price
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the product
 *         sku:
 *           type: string
 *           description: Unique product SKU
 *         description:
 *           type: string
 *           description: Product description
 *         price:
 *           type: number
 *           description: Selling price of the product
  *         quantity:
  *           type: integer
  *           description: Current stock quantity (single source of truth)
  *         tax:
  *           type: number
  *           description: Tax rate (0 to 1)
 *         unit:
 *           type: string
 *           enum: [piece, box, case, pound, gallon, liter]
 *           description: Unit of measure
  *         isActive:
  *           type: boolean
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *       example:
 *         name: "Coca Cola"
 *         sku: "COCA123"
 *         description: "500ml bottle"
 *         price: 50
  *         quantity: 100
  *         tax: 0.1
 *         unit: "piece"
  *         isActive: true
 *         tags: ["softdrink", "cold"]
 *
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation Error
 * 
 * 
 */


/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get current stock levels
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: warehouseId
 *         schema:
 *           type: string
 *         description: Filter by warehouse ID
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Show only low stock items
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
 *         description: Current stock levels
 *       401:
 *         description: Unauthorized
 */


/**
 * @swagger
 * /products/{productId}:
 *   get:
 *     summary: Get product by id
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
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

/**
  @swagger
 * /products/{productId}:
 *   put:
 *    summary: Update a product
 *    tags: [Inventory]
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - in: path
 *        name: productId
 *        required: true
 *        schema:
 *          type: string
 *        description: Product ID
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Product'
 *    responses:
 *      200:
 *        description: Product updated successfully
 */
/**
 @swagger
 * /products/{productId}:
 *   delete:
 *     summary: delete a product
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 */
