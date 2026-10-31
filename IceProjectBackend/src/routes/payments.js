const express = require("express");
const Joi = require("joi");

const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { getDAL } = require("../dal");
const logger = require("../utils/logger");

const router = express.Router();

// Validation schemas
const createPaymentSchema = Joi.object({
  customerId: Joi.string().required(),
  invoiceId: Joi.string().optional(),
  amount: Joi.number().min(0.01).precision(2).required(),
  method: Joi.string()
    .valid("cash", "card", "ach", "charge_account")
    .required(),
  reference: Joi.string().max(100).optional(),
  notes: Joi.string().max(500).optional(),
  receivedAt: Joi.date().default(Date.now),
});

const updatePaymentSchema = Joi.object({
  amount: Joi.number().min(0.01).precision(2).optional(),
  method: Joi.string()
    .valid("cash", "card", "ach", "charge_account")
    .optional(),
  reference: Joi.string().max(100).optional(),
  notes: Joi.string().max(500).optional(),
});

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Get all payments with optional filtering
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *         description: Filter by customer ID
 *       - in: query
 *         name: invoiceId
 *         schema:
 *           type: string
 *         description: Filter by invoice ID
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [cash, card, ach, charge_account]
 *         description: Filter by payment method
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments to date
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
 *         description: List of payments
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Accountant"]),
  async (req, res, next) => {
    try {
      const {
        customerId,
        invoiceId,
        method,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
      } = req.query;

      const dal = getDAL();
      const result = await dal.listPayments({
        customerId,
        invoiceId,
        method,
        dateFrom,
        dateTo,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({
        payments: result.payments,
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
 * /payments:
 *   post:
 *     summary: Record a new payment
 *     tags: [Payments]
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
 *               - amount
 *               - method
 *             properties:
 *               customerId:
 *                 type: string
 *               invoiceId:
 *                 type: string
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               method:
 *                 type: string
 *                 enum: [cash, card, ach, charge_account]
 *               reference:
 *                 type: string
 *                 maxLength: 100
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *               receivedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Payment recorded successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Customer or invoice not found
 */
router.post(
  "/",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Accountant"]),
  async (req, res, next) => {
    try {
      const { error, value } = createPaymentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const payment = await dal.recordPayment({
        ...value,
        recordedBy: req.user.userId,
      });

      logger.info("Payment recorded", {
        paymentId: payment.id,
        customerId: payment.customerId,
        amount: payment.amount,
        method: payment.method,
        recordedBy: req.user.userId,
      });

      res.status(201).json({
        message: "Payment recorded successfully",
        payment,
      });
    } catch (error) {
      if (
        error.message === "Customer not found" ||
        error.message === "Invoice not found"
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
 * /payments/{id}:
 *   get:
 *     summary: Get payment by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment details
 *       404:
 *         description: Payment not found
 */
router.get(
  "/:id",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Accountant"]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
      const payment = await dal.getPaymentById(req.params.id);

      if (!payment) {
        return res.status(404).json({
          error: "Payment not found",
          message: "Payment with the specified ID does not exist",
        });
      }

      res.json({ payment });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /payments/{id}:
 *   put:
 *     summary: Update payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               method:
 *                 type: string
 *                 enum: [cash, card, ach, charge_account]
 *               reference:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment updated successfully
 *       400:
 *         description: Cannot update payment
 *       404:
 *         description: Payment not found
 */
router.put(
  "/:id",
  requireAuth,
  requireRole(["Admin", "Accountant"]),
  async (req, res, next) => {
    try {
      const { error, value } = updatePaymentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const payment = await dal.updatePayment(req.params.id, {
        ...value,
        updatedBy: req.user.userId,
      });

      if (!payment) {
        return res.status(404).json({
          error: "Payment not found",
          message: "Payment with the specified ID does not exist",
        });
      }

      logger.info("Payment updated", {
        paymentId: payment.id,
        updatedBy: req.user.userId,
      });

      res.json({
        message: "Payment updated successfully",
        payment,
      });
    } catch (error) {
      if (error.message === "Cannot update payment") {
        return res.status(400).json({
          error: "Cannot update payment",
          message: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * @swagger
 * /payments/{id}:
 *   delete:
 *     summary: Delete payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment deleted successfully
 *       400:
 *         description: Cannot delete payment
 *       404:
 *         description: Payment not found
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole(["Admin"]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
      const deleted = await dal.deletePayment(req.params.id);

      if (!deleted) {
        return res.status(404).json({
          error: "Payment not found",
          message: "Payment with the specified ID does not exist",
        });
      }

      logger.info("Payment deleted", {
        paymentId: req.params.id,
        deletedBy: req.user.userId,
      });

      res.json({
        message: "Payment deleted successfully",
      });
    } catch (error) {
      if (error.message === "Cannot delete payment") {
        return res.status(400).json({
          error: "Cannot delete payment",
          message: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * @swagger
 * /payments/customer/{customerId}:
 *   get:
 *     summary: Get payments for a specific customer
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
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
 *         description: Customer payments
 *       404:
 *         description: Customer not found
 */
router.get(
  "/customer/:customerId",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Accountant"]),
  async (req, res, next) => {
    try {
      const { page = 1, limit = 20 } = req.query;

      const dal = getDAL();
      const customer = await dal.getCustomerById(req.params.customerId);

      if (!customer) {
        return res.status(404).json({
          error: "Customer not found",
          message: "Customer with the specified ID does not exist",
        });
      }

      const payments = await dal.listCustomersPayments(req.params.customerId, {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
        },
        payments: payments.payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: payments.total,
          pages: Math.ceil(payments.total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /payments/invoice/{invoiceId}:
 *   get:
 *     summary: Get payments for a specific invoice
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice payments
 *       404:
 *         description: Invoice not found
 */
router.get(
  "/invoice/:invoiceId",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Accountant"]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
      const invoice = await dal.getInvoiceById(req.params.invoiceId);

      if (!invoice) {
        return res.status(404).json({
          error: "Invoice not found",
          message: "Invoice with the specified ID does not exist",
        });
      }

      const payments = await dal.getInvoicePayments(req.params.invoiceId);

      res.json({
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total,
          status: invoice.status,
        },
        payments,
        totalPaid: payments.reduce((sum, p) => sum + p.amount, 0),
        balance: invoice.total - payments.reduce((sum, p) => sum + p.amount, 0),
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
