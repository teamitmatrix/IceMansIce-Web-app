const express = require("express");
const mongoose = require("mongoose");
const Joi = require("joi");

const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { getDAL } = require("../dal");
const logger = require("../utils/logger");

const router = express.Router();

const createOrderSchema = Joi.object({
  customerId: Joi.string().optional(),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().optional().allow(null, ''), // Made optional for manual entries
        productName: Joi.string().required(), // Now required for manual entries
        quantity: Joi.number().min(1).required(),
        unitPrice: Joi.number().min(0).precision(2).required(),
        discount: Joi.number().min(0).max(100).default(0),
      })
    )
    .min(1)
    .required(),
  deliveryDate: Joi.date().min("now").optional(),
  specialInstructions: Joi.string().max(500).optional(),
  deliveryType: Joi.string().valid("standard delivery", "refused delivery", "no delivery needed", "service call").optional(),
  requiresApproval: Joi.boolean().default(false),
  poNumber: Joi.string().trim().max(100).optional(),
  paymentTerms: Joi.string().valid("due on cash", "immediate", "net7", "net10", "net15", "net30", "net60").optional(),
});

const updateOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().optional().allow(null, ''),
        productName: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        unitPrice: Joi.number().min(0).precision(2).required(),
        discount: Joi.number().min(0).max(100).default(0),
      })
    )
    .min(1)
    .optional(),
  deliveryDate: Joi.date().optional(),
  specialInstructions: Joi.string().max(500).optional(),
  deliveryType: Joi.string().valid("standard delivery", "refused delivery", "no delivery needed", "service call").optional(),
  poNumber: Joi.string().trim().max(100).optional(),
  paymentTerms: Joi.string().valid("due on cash", "immediate", "net7", "net10", "net15", "net30", "net60").optional(),
});

router.get(
  "/",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Driver", "Accountant", "Customer"]),
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

      const dal = getDAL();
      
      // For customers, only show their own orders
      let filterCustomerId = customerId;
      if (req.user.role === "Customer") {
        // Get customer ID for this user
        const customer = await dal.getCustomerByUserId(req.user.userId);
        if (!customer) {
          return res.status(404).json({
            error: "Customer not found",
            message: "No customer profile found for this user",
          });
        }
        filterCustomerId = customer.id;
      }

      const result = await dal.listSalesOrders(
        {
          status,
          customerId: filterCustomerId,
          startDate: dateFrom,
          endDate: dateTo,
          search,
        },
        {
          page: parseInt(page),
          limit: parseInt(limit),
        }
      );

      res.json({
        orders: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);
router.post(
  "/",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Customer"]),
  async (req, res, next) => {
    try {
      const { error, value } = createOrderSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      
      // Handle customer ID for different user roles
      let orderData = { ...value };
      if (req.user.role === "Customer") {
        const customer = await dal.getCustomerByUserId(req.user.userId);
        if (!customer) {
          return res.status(404).json({
            error: "Customer not found",
            message: "No customer profile found for this user",
          });
        }
        orderData.customerId = customer.id;
        logger.info("Order creation for Customer user", {
          userId: req.user.userId,
          customerFound: !!customer,
          customerId: customer.id,
          customerIdString: customer.id?.toString()
        });
      } else {
        // For non-customer users (Admin, SalesRep), use a default customer or create a placeholder
        // You can modify this logic based on your business needs
        if (!orderData.customerId) {
          // For now, we'll create a default customer ID - you may want to handle this differently
          orderData.customerId = new mongoose.Types.ObjectId(); // Temporary placeholder
        }
      }

      const order = await dal.createSalesOrder({
        ...orderData,
        createdBy: req.user.userId,
      });

      logger.info("Sales order created", {
        orderId: order.id,
        customerId: order.customerId,
        status: order.status,
        createdBy: req.user.userId,
      });

      res.status(201).json({
        message: "Sales order created successfully",
        order,
      });
    } catch (error) {
      if (
        error.message === "Customer not found"
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


router.get(
  "/:id",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Driver", "Accountant", "Customer"]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
      const order = await dal.getSalesOrderById(req.params.id);

      if (!order) {
        return res.status(404).json({
          error: "Order not found",
          message: "Sales order with the specified ID does not exist",
        });
      }

      // Access control: Users can access orders they created
      // For Customer role: check customer profile match
      // For other roles: check if they created the order
      logger.info("Order access check", {
        userId: req.user.userId,
        userRole: req.user.role,
        orderId: req.params.id,
        orderCreatedBy: order.createdBy,
        orderCustomerId: order.customerId
      });

      if (req.user.role === "Customer") {
        const customer = await dal.getCustomerByUserId(req.user.userId);
        logger.info("Customer profile check", {
          customerFound: !!customer,
          customerId: customer?.id,
          customerIdString: customer?.id?.toString(),
          orderCustomerId: order.customerId,
          orderCustomerIdString: order.customerId?.toString(),
          idsMatch: customer?.id?.toString() === order.customerId?.toString()
        });
        
        // If customer exists and order belongs to them, allow access
        // If customer doesn't exist but user created the order, allow access
        if (customer && order.customerId.toString() !== customer.id.toString()) {
          logger.warn("Access denied: Customer ID mismatch", {
            customerIdFromProfile: customer.id,
            orderCustomerId: order.customerId
          });
          return res.status(403).json({
            error: "Access denied",
            message: "You can only access your own orders",
          });
        }
        // If no customer profile but user created the order, allow access
        if (!customer && order.createdBy && order.createdBy.toString() !== req.user.userId.toString()) {
          logger.warn("Access denied: No customer profile and didn't create order", {
            orderCreatedBy: order.createdBy,
            userId: req.user.userId
          });
          return res.status(403).json({
            error: "Access denied",
            message: "You can only access orders you created",
          });
        }
      } else {
        // For Admin/SalesRep: allow access to orders they created or all orders (based on your business logic)
        // For now, we'll allow access to all orders for Admin/SalesRep users
        // You can restrict this further if needed
        logger.info("Non-customer user access granted", {
          userRole: req.user.role
        });
      }

      res.json({ order });
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
      const { error, value } = updateOrderSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const order = await dal.updateSalesOrder(req.params.id, {
        ...value,
        updatedBy: req.user.userId,
      });

      if (!order) {
        return res.status(404).json({
          error: "Order not found",
          message: "Sales order with the specified ID does not exist",
        });
      }

      logger.info("Sales order updated", {
        orderId: order.id,
        updatedBy: req.user.userId,
      });

      res.json({
        message: "Sales order updated successfully",
        order,
      });
    } catch (error) {
      if (error.message === "Cannot update order in current status") {
        return res.status(400).json({
          error: "Cannot update order",
          message: error.message,
        });
      }
      next(error);
    }
  }
);


router.post(
  "/:id/approve",
  requireAuth,
  requireRole(["Admin"]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
      const order = await dal.approveSalesOrder(req.params.id, req.user.userId);

      if (!order) {
        return res.status(404).json({
          error: "Order not found",
          message: "Sales order with the specified ID does not exist",
        });
      }

      logger.info("Sales order approved", {
        orderId: order.id,
        approvedBy: req.user.userId,
      });

      res.json({
        message: "Sales order approved successfully",
        order,
      });
    } catch (error) {
      if (error.message === "Order cannot be approved in current status") {
        return res.status(400).json({
          error: "Cannot approve order",
          message: error.message,
        });
      }
      next(error);
    }
  }
);


router.post(
  "/:id/cancel",
  requireAuth,
  requireRole(["Admin", "SalesRep"]),
  async (req, res, next) => {
    try {
      const { reason } = req.body;

      const dal = getDAL();
      const order = await dal.cancelSalesOrder(req.params.id, {
        reason,
        cancelledBy: req.user.userId,
      });

      if (!order) {
        return res.status(404).json({
          error: "Order not found",
          message: "Sales order with the specified ID does not exist",
        });
      }

      logger.info("Sales order cancelled", {
        orderId: order.id,
        reason,
        cancelledBy: req.user.userId,
      });

      res.json({
        message: "Sales order cancelled successfully",
        order,
      });
    } catch (error) {
      if (error.message === "Order cannot be cancelled in current status") {
        return res.status(400).json({
          error: "Cannot cancel order",
          message: error.message,
        });
      }
      next(error);
    }
  }
);


router.post(
  "/:id/status",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Driver"]),
  async (req, res, next) => {
    try {
      const { status, notes } = req.body;

      if (!["processing", "shipped", "delivered"].includes(status)) {
        return res.status(400).json({
          error: "Invalid status",
          message: "Invalid order status",
        });
      }

      const dal = getDAL();
      const order = await dal.updateOrderStatus(req.params.id, {
        status,
        notes,
        updatedBy: req.user.userId,
      });

      if (!order) {
        return res.status(404).json({
          error: "Order not found",
          message: "Sales order with the specified ID does not exist",
        });
      }

      logger.info("Order status updated", {
        orderId: order.id,
        status,
        updatedBy: req.user.userId,
      });

      res.json({
        message: "Order status updated successfully",
        order,
      });
    } catch (error) {
      if (error.message === "Invalid status transition") {
        return res.status(400).json({
          error: "Invalid status transition",
          message: error.message,
        });
      }
      next(error);
    }
  }
);

// Bulk delete sales orders
router.post(
  "/bulk-delete",
  requireAuth,
  requireRole(["Admin", "SalesRep"]),
  async (req, res, next) => {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
      if (!ids.length) {
        return res.status(400).json({
          error: "Invalid request",
          message: "Body must include an array 'ids' with at least one order id",
        });
      }

      const dal = getDAL();
      const deleted = [];
      const skipped = [];
      const failed = [];

      // Process in parallel but with per-id error isolation
      const tasks = ids.map(async (id) => {
        try {
          // Skip if invoice exists for this order
          try {
            const inv = await dal.getInvoiceByOrderId(id);
            if (inv) {
              skipped.push({ id, reason: "has-invoice", invoiceId: inv._id, invoiceNumber: inv.invoiceNumber });
              return;
            }
          } catch (_) {
            // No invoice found - OK to proceed
          }
          await dal.deleteSalesOrder(id);
          deleted.push(id);
        } catch (err) {
          failed.push({ id, error: err?.message || "delete-failed" });
        }
      });

      await Promise.all(tasks);

      return res.json({
        message: `Bulk delete completed: deleted=${deleted.length}, skipped=${skipped.length}, failed=${failed.length}`,
        deleted,
        skipped,
        failed,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete a sales order
router.delete(
  "/:id",
  requireAuth,
  requireRole(["Admin", "SalesRep"]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
      // Prevent deleting an order that already has an invoice
      try {
        const existingInvoice = await dal.getInvoiceByOrderId(req.params.id);
        if (existingInvoice) {
          return res.status(400).json({
            error: "Order has invoice",
            message: `Cannot delete order; invoice ${existingInvoice.invoiceNumber || existingInvoice._id} exists`,
            invoiceId: existingInvoice._id,
            invoiceNumber: existingInvoice.invoiceNumber,
          });
        }
      } catch (_) {
        // dal.getInvoiceByOrderId throws NotFound if none; ignore and proceed
      }

      const deleted = await dal.deleteSalesOrder(req.params.id);
      return res.json({
        message: "Sales order deleted successfully",
        order: deleted,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

