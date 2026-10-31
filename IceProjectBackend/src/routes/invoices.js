const express = require("express");
const Joi = require("joi");

const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { getDAL } = require("../dal");
const logger = require("../utils/logger");

const router = express.Router();

// Validation schemas
const createInvoiceSchema = Joi.object({
  customerId: Joi.string().required(),
  orderId: Joi.string().optional(),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        unitPrice: Joi.number().min(0).precision(2).required(),
        discount: Joi.number().min(0).max(100).default(0),
      })
    )
    .min(1)
    .required(),
  dueDate: Joi.date().min("now").optional(),
  notes: Joi.string().max(500).optional(),
  taxRate: Joi.number().min(0).max(100).default(0),
  poNumber: Joi.string().trim().max(100).optional(),
  paymentTerms: Joi.string().valid("due on cash", "immediate", "net7", "net10", "net15", "net30", "net60").optional(),
});

const updateInvoiceSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        unitPrice: Joi.number().min(0).precision(2).required(),
        discount: Joi.number().min(0).max(100).default(0),
      })
    )
    .min(1)
    .optional(),
  dueDate: Joi.date().optional(),
  notes: Joi.string().max(500).optional(),
  taxRate: Joi.number().min(0).max(100).optional(),
  poNumber: Joi.string().trim().max(100).optional(),
  paymentTerms: Joi.string().valid("due on cash", "immediate", "net7", "net10", "net15", "net30", "net60").optional(),
});

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: Get all invoices with optional filtering
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sent, paid, overdue, cancelled]
 *         description: Filter by invoice status
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *         description: Filter by customer ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter invoices from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter invoices to date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by invoice number or customer name/email/phone
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
 *         description: List of invoices
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Accountant", "Customer"]),
  async (req, res, next) => {
    try {
      const {
        status,
        customerId,
        dateFrom,
        dateTo,
        search,
        page = 1,
        limit = 20,
      } = req.query;

      console.log("Invoice route filters:", { 
        status, 
        customerId, 
        dateFrom, 
        dateTo, 
        search, 
        page, 
        limit 
      }); // Debug log

      const dal = getDAL();
      
      // For customers, only show their own invoices
      let filterCustomerId = customerId;
      if (req.user.role === "Customer") {
        const customer = await dal.getCustomerByUserId(req.user.userId);
        if (!customer) {
          return res.status(404).json({
            error: "Customer not found",
            message: "No customer profile found for this user",
          });
        }
        filterCustomerId = customer.id;
      }

      const result = await dal.listInvoices(
        {
          status,
          customerId: filterCustomerId,
          // Normalize date keys for DAL (expects startDate/endDate)
          startDate: dateFrom,
          endDate: dateTo,
          search,
        },
        {
          page: parseInt(page),
          limit: parseInt(limit),
        }
      );

      console.log("Invoice route result:", { 
        invoiceCount: result.data.length, 
        total: result.total,
        pagination: result.pagination
      }); // Debug log

      res.json({
        invoices: result.data,
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
 * /invoices:
 *   post:
 *     summary: Create a new invoice
 *     tags: [Invoices]
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
 *             properties:
 *               customerId:
 *                 type: string
 *               orderId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                     - unitPrice
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                       minimum: 1
 *                     unitPrice:
 *                       type: number
 *                       minimum: 0
 *                     discount:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *                       default: 0
 *               dueDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *               taxRate:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 0
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Customer or product not found
 */
router.post(
  "/",
  requireAuth,
  requireRole(["Admin", "SalesRep"]),
  async (req, res, next) => {
    try {
      const { error, value } = createInvoiceSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const invoice = await dal.createInvoice({
        ...value,
        createdBy: req.user.userId,
      });

      logger.info("Invoice created", {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        total: invoice.total,
        createdBy: req.user.userId,
      });

      res.status(201).json({
        message: "Invoice created successfully",
        invoice,
      });
    } catch (error) {
      if (
        error.message === "Customer not found" ||
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
 * /invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice details
 *       404:
 *         description: Invoice not found
 */
router.get(
  "/:id",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Accountant", "Customer"]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
      const invoice = await dal.getInvoiceById(req.params.id);

      if (!invoice) {
        return res.status(404).json({
          error: "Invoice not found",
          message: "Invoice with the specified ID does not exist",
        });
      }

      // For customers, only allow access to their own invoices
      if (req.user.role === "Customer") {
        const customer = await dal.getCustomerByUserId(req.user.userId);
        if (!customer || invoice.customerId.toString() !== customer.id.toString()) {
          return res.status(403).json({
            error: "Access denied",
            message: "You can only access your own invoices",
          });
        }
      }

      res.json({ invoice });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /invoices/{id}:
 *   put:
 *     summary: Update invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *               dueDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               taxRate:
 *                 type: number
 *     responses:
 *       200:
 *         description: Invoice updated successfully
 *       400:
 *         description: Cannot update paid invoice
 *       404:
 *         description: Invoice not found
 */
router.put(
  "/:id",
  requireAuth,
  requireRole(["Admin", "SalesRep"]),
  async (req, res, next) => {
    try {
      const { error, value } = updateInvoiceSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const invoice = await dal.updateInvoice(req.params.id, {
        ...value,
        updatedBy: req.user.userId,
      });

      if (!invoice) {
        return res.status(404).json({
          error: "Invoice not found",
          message: "Invoice with the specified ID does not exist",
        });
      }

      logger.info("Invoice updated", {
        invoiceId: invoice.id,
        updatedBy: req.user.userId,
      });

      res.json({
        message: "Invoice updated successfully",
        invoice,
      });
    } catch (error) {
      if (error.message === "Cannot update paid invoice") {
        return res.status(400).json({
          error: "Cannot update invoice",
          message: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * @swagger
 * /invoices/{id}/send:
 *   post:
 *     summary: Send invoice to customer
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice sent successfully
 *       400:
 *         description: Invoice cannot be sent
 *       404:
 *         description: Invoice not found
 */
router.post(
  "/:id/send",
  requireAuth,
  requireRole(["Admin", "SalesRep"]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
      const invoice = await dal.sendInvoice(req.params.id, req.user.userId);

      if (!invoice) {
        return res.status(404).json({
          error: "Invoice not found",
          message: "Invoice with the specified ID does not exist",
        });
      }

      logger.info("Invoice sent", {
        invoiceId: invoice.id,
        sentBy: req.user.userId,
      });

      res.json({
        message: "Invoice sent successfully",
        invoice,
      });
    } catch (error) {
      if (error.message === "Invoice cannot be sent in current status") {
        return res.status(400).json({
          error: "Cannot send invoice",
          message: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * @swagger
 * /invoices/{id}/mark-paid:
 *   post:
 *     summary: Mark invoice as paid
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethod
 *               - amount
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, ach, charge_account]
 *               amount:
 *                 type: number
 *                 minimum: 0
 *               reference:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invoice marked as paid successfully
 *       400:
 *         description: Invalid payment amount
 *       404:
 *         description: Invoice not found
 */
router.post(
  "/:id/mark-paid",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Accountant"]),
  async (req, res, next) => {
    try {
      const { paymentMethod, amount, reference, notes } = req.body;

      if (!paymentMethod || !amount || amount <= 0) {
        return res.status(400).json({
          error: "Invalid payment data",
          message: "Payment method and amount are required",
        });
      }

      const dal = getDAL();
      const result = await dal.markInvoiceAsPaid(req.params.id, {
        paymentMethod,
        amount,
        reference,
        notes,
        recordedBy: req.user.userId,
      });

      if (!result.invoice) {
        return res.status(404).json({
          error: "Invoice not found",
          message: "Invoice with the specified ID does not exist",
        });
      }

      logger.info("Invoice marked as paid", {
        invoiceId: result.invoice.id,
        amount,
        paymentMethod,
        recordedBy: req.user.userId,
      });

      res.json({
        message: "Invoice marked as paid successfully",
        invoice: result.invoice,
        payment: result.payment,
      });
    } catch (error) {
      if (
        error.message === "Invalid payment amount" ||
        error.message === "Invoice already paid"
      ) {
        return res.status(400).json({
          error: "Payment Error",
          message: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * @swagger
 * /invoices/{id}/receipt:
 *   get:
 *     summary: Get invoice receipt data
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Receipt data for printing
 *       404:
 *         description: Invoice not found
 */
router.get(
  "/:id/receipt",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Driver"]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
      const invoice = await dal.getInvoiceById(req.params.id);

      if (!invoice) {
        return res.status(404).json({
          error: "Invoice not found",
          message: "Invoice with the specified ID does not exist",
        });
      }

      const customer = await dal.getCustomerById(invoice.customerId);
      const payments = await dal.findPaymentsByInvoice(invoice.id || invoice._id);

      const receiptData = {
        invoice: {
          id: invoice.id,
          number: invoice.invoiceNumber,
          date: invoice.createdAt,
          dueDate: invoice.dueDate,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total,
          status: invoice.status,
        },
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
        },
        items: invoice.items,
        payments: payments.map((payment) => ({
          date: payment.receivedAt,
          method: payment.method,
          amount: payment.amount,
          reference: payment.reference,
        })),
        balance: invoice.total - payments.reduce((sum, p) => sum + p.amount, 0),
      };

      res.json({
        receipt: receiptData,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /invoices/{id}:
 *   delete:
 *     summary: Delete an invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice deleted successfully
 *       404:
 *         description: Invoice not found
 *       403:
 *         description: Cannot delete invoice with payments
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole(["Admin", "Accountant"]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
      const invoice = await dal.getInvoiceById(req.params.id);

      if (!invoice) {
        return res.status(404).json({
          error: "Invoice not found",
          message: "Invoice with the specified ID does not exist",
        });
      }

      // Admin can delete any invoice (paid or unpaid)
      await dal.deleteInvoice(req.params.id);

      logger.info("Invoice deleted", {
        invoiceId: req.params.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        amountPaid: invoice.amountPaid,
        deletedBy: req.user.userId,
      });

      res.json({
        message: "Invoice deleted successfully",
        invoiceId: req.params.id,
      });
    } catch (error) {
      logger.error("Error deleting invoice", {
        error: error.message,
        invoiceId: req.params.id,
        userId: req.user?.userId,
      });
      next(error);
    }
  }
);

module.exports = router;
