const adminService = require("../services/adminService");
const logger = require("../utils/logger");
const { ValidationError } = require("../utils/errors");
const { getDAL } = require("../dal");
const Joi = require("joi");
const SalesOrder = require("../models/SalesOrder");

// Admin & Driver updates order: prices, tax, status, driver, notes
async function updateOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { user } = req.user;
    console.log("User updating order:", user);

    // Validation Schema
    const schema = Joi.object({
      status: Joi.string()
        .valid("pending", "confirmed", "in_transit", "delivered", "cancelled")
        .optional(),
      items: Joi.array()
        .items(
          Joi.object({
            productId: Joi.string().required(),
            unitPrice: Joi.number().min(0).required(),
            tax: Joi.number().min(0).max(1).optional().default(0), // individual product tax
          })
        )
        .optional(),
    }).min(1);

    const { error, value } = schema.validate(req.body);
    if (error)
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });

    const dal = getDAL();
    const order = await dal.getSalesOrderById(id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    //  Update item prices and taxes
    if (value.items && Array.isArray(value.items)) {
      order.items = order.items.map((item) => {
        const updated = value.items.find(
          (i) => i.productId.toString() === item.productId.toString()
        );
        if (updated) {
          item.unitPrice = updated.unitPrice;
          console.log("Updating item tax:", updated.tax);
          item.tax = updated.tax ?? item.tax ?? 0;

          const baseTotal = item.unitPrice * item.quantity - (item.discount || 0);
          const itemTaxAmount = baseTotal * (item.tax || 0);
          item.lineTotal = baseTotal + itemTaxAmount;
          item.taxAmount = itemTaxAmount; // store for reference
        }
        return item;
      });
    }

    // Recalculate totals
    order.subtotal = order.items.reduce(
      (sum, i) => sum + (i.unitPrice * i.quantity - (i.discount || 0)),
      0
    );
    order.taxAmount = order.items.reduce((sum, i) => sum + (i.taxAmount || 0), 0);
    order.total = order.subtotal + order.taxAmount;

    // Update status if provided
    if (value.status) {
      order.status = value.status;
    }

    order.updatedAt = new Date();

    const updatedOrder = await SalesOrder.findByIdAndUpdate(id, order, { new: true });

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (err) {
    console.error("Error updating order:", err);
    next(err);
  }
}


// admin & driver generate invoice for an order
async function createInvoiceForOrder(req, res, next) {
  try {
    const { order } = req.body;

    if (!order) {
      return res.status(400).json({ error: "Order is required" });
    }
    const dal = getDAL();
    const createdInvoice = await dal.createAdminInvoice(order, req.user);
    res.status(201).json({
      message: "Invoice created successfully",
      invoice: createdInvoice,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  updateOrder,
  createInvoiceForOrder,
};