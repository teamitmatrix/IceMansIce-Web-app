const mongoose = require("mongoose");

const salesOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: false, // Now optional since we're using manual entry
        },
        productName: {
          type: String,
          required: true, // This becomes the primary identifier
        },
        name: {
          type: String,
          required: false, // Make optional for backwards compatibility
        },
        sku: {
          type: String,
          required: false, // Make optional for manual entries
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        unitPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        discount: {
          type: Number,
          default: 0,
          min: 0,
        },
        taxRate: {
          type: Number,
          default: 0,
          min: 0,
          max: 1,
        },
        lineTotal: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        "draft",
        "pending",
        "approved",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "draft",
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    requestedDeliveryDate: {
      type: Date,
      default: Date.now,
    },
    actualDeliveryDate: {
      type: Date,
    },
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      // country: {
      //   type: String,
      // },
    },
    specialInstructions: {
      type: String,
      maxlength: 1000,
    },
    deliveryType: {
      type: String,
      enum: [
        "standard delivery",
        "refused delivery",
        "no delivery needed",
        "service call",
      ],
      default: "standard delivery",
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdByDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
    },
    driverLocation: {
      latitude: Number,
      longitude: Number,
      timestamp: Date,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "online", "check", "charged"],
    },
    checkNumber: {
      type: String,
      required: false,
    },
    isPaidOnDelivery: {
      type: Boolean,
      default: false,
    },
    isPaidOnline: {
      type: Boolean,
      default: false,
    },
    poNumber: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    paymentTerms: {
      type: String,
      enum: ["due on cash", "immediate", "net7", "net10", "net15", "net30", "net60"],
      default: "immediate",
    },
    receiptPrinted: {
      type: Boolean,
      default: false,
    },
    printerInfo: {
      type: String,
      maxlength: 200,
    },
    qboId: {
      type: String,
      sparse: true,
    },
    qboSyncStatus: {
      type: String,
      enum: ["pending", "synced", "failed"],
      default: "pending",
    },
    qboLastSync: {
      type: Date,
    },
    clientId: {
      type: String,
      sparse: true,
    },
    clientVersion: {
      type: Number,
      default: 0,
    },
    serverVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Primary indexes
salesOrderSchema.index({ orderNumber: 1 }, { unique: true });
salesOrderSchema.index({ customerId: 1 });
salesOrderSchema.index({ status: 1 });

// Compound indexes for common queries
salesOrderSchema.index({ customerId: 1, status: 1 });
salesOrderSchema.index({ status: 1, orderDate: -1 });
salesOrderSchema.index({ customerId: 1, orderDate: -1 });
salesOrderSchema.index({ assignedDriver: 1, status: 1 });
salesOrderSchema.index({ createdByDriver: 1, status: 1 });

// Date-based queries
salesOrderSchema.index({ orderDate: -1 });
salesOrderSchema.index({ requestedDeliveryDate: 1 });
salesOrderSchema.index({ createdAt: -1 });
salesOrderSchema.index({ updatedAt: -1 });

// Driver-related queries
salesOrderSchema.index({ assignedDriver: 1 });
salesOrderSchema.index({ createdByDriver: 1 });

// Search indexes
salesOrderSchema.index(
  {
    orderNumber: "text",
    "customerId.name": "text",
    "items.productName": "text",
  },
  {
    weights: {
      orderNumber: 10,
      "customerId.name": 5,
      "items.productName": 3,
    },
    name: "order_text_search",
  }
);

// Performance indexes
salesOrderSchema.index({ total: 1 }); // For financial queries
// paymentStatus is not a stored field; do not index
// orderDate already indexed above (date-based)
// requestedDeliveryDate already indexed above (date-based)
// assignedDriver already indexed above (driver-related)

salesOrderSchema.virtual("orderAge").get(function () {
  const today = new Date();
  const orderDate = new Date(this.orderDate);
  const diffTime = today - orderDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Note: canonical field is deliveryAddress.zipCode; no alias virtual to avoid ambiguity

salesOrderSchema.virtual("deliveryStatus").get(function () {
  if (this.status === "delivered") return "delivered";
  if (this.status === "shipped") return "in_transit";
  if (this.status === "processing") return "processing";
  if (this.status === "approved") return "ready_for_delivery";
  if (this.status === "pending") return "pending_approval";
  if (this.status === "draft") return "draft";
  return "cancelled";
});

salesOrderSchema.methods.calculateTotals = function () {
  this.subtotal = this.items.reduce((sum, item) => {
    const lineTotal = item.unitPrice * item.quantity - item.discount;
    return sum + lineTotal;
  }, 0);

  this.taxAmount = this.items.reduce((sum, item) => {
    const lineTotal = item.unitPrice * item.quantity - item.discount;
    return sum + lineTotal * item.taxRate;
  }, 0);

  this.total = this.subtotal + this.taxAmount - this.discountAmount;

  return this;
};

salesOrderSchema.methods.approve = function (userId) {
  this.status = "approved";
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

salesOrderSchema.methods.assignDriver = function (driverId) {
  this.assignedDriver = driverId;
  if (this.status === "approved") {
    this.status = "processing";
  }
  return this.save();
};

salesOrderSchema.methods.markShipped = function () {
  this.status = "shipped";
  return this.save();
};

salesOrderSchema.methods.markDelivered = function () {
  this.status = "delivered";
  this.actualDeliveryDate = new Date();
  return this.save();
};

salesOrderSchema.statics.generateOrderNumber = async function () {
  const lastOrder = await this.findOne().sort({ orderNumber: -1 });
  const lastNumber = lastOrder
    ? parseInt(lastOrder.orderNumber.replace("SO-", ""))
    : 0;
  return `SO-${String(lastNumber + 1).padStart(6, "0")}`;
};

salesOrderSchema.statics.findByCustomer = function (customerId) {
  return this.find({ customerId }).sort({ orderDate: -1 });
};

salesOrderSchema.statics.findByDriver = function (driverId) {
  return this.find({ assignedDriver: driverId }).sort({
    requestedDeliveryDate: 1,
  });
};

salesOrderSchema.statics.findPendingApproval = function () {
  return this.find({ status: "pending" }).populate(
    "customerId",
    "name email phone"
  );
};

salesOrderSchema.set("toJSON", {
  virtuals: true,
});

module.exports = mongoose.model("SalesOrder", salesOrderSchema);

/**
 * @swagger
 * tags:
 *   name: SalesOrders
 *   description: API for managing sales orders
 *
 * components:
 *   schemas:
 *     SalesOrderItem:
 *       type: object
 *       required:
 *         - productId
 *         - quantity
 *         - unitPrice
 *       properties:
 *         productId:
 *           type: string
 *           description: Product ID
 *         quantity:
 *           type: number
 *           minimum: 1
 *         unitPrice:
 *           type: number
 *           minimum: 0
 *           format: float
 *         discount:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           default: 0
 *
 *     SalesOrder:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         orderNumber:
 *           type: string
 *         customerId:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SalesOrderItem'
 *         subtotal:
 *           type: number
 *         taxAmount:
 *           type: number
 *         discountAmount:
 *           type: number
 *         total:
 *           type: number
 *         status:
 *           type: string
 *           enum: [draft, pending, approved, processing, shipped, delivered, cancelled]
 *         orderDate:
 *           type: string
 *           format: date-time
 *         requestedDeliveryDate:
 *           type: string
 *           format: date-time
 *         actualDeliveryDate:
 *           type: string
 *           format: date-time
 *         deliveryAddress:
 *           type: object
 *           properties:
 *             street: { type: string }
 *             city: { type: string }
 *             state: { type: string }
 *             zipCode: { type: string }
 *             country: { type: string }
 *         specialInstructions:
 *           type: string
 *         notes:
 *           type: string
 *         approvedBy:
 *           type: string
 *         approvedAt:
 *           type: string
 *           format: date-time
 *         assignedDriver:
 *           type: string
 *         routeId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 * /orders:
 *   get:
 *     summary: Get list of sales orders
 *     tags: [SalesOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: customerId
 *         schema: { type: string }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of sales orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SalesOrder'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     pages: { type: integer }
 *
 *   post:
 *     summary: Create a sales order
 *     tags: [SalesOrders]
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
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/SalesOrderItem'
 *               deliveryDate:
 *                 type: string
 *                 format: date
 *               specialInstructions:
 *                 type: string
 *               requiresApproval:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Sales order created successfully
 *       400:
 *         description: Validation error
 *
 * /orders/{id}:
 *   get:
 *     summary: Get sales order by ID
 *     tags: [SalesOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sales order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesOrder'
 *       404:
 *         description: Order not found
 *
 *   put:
 *     summary: Update sales order
 *     tags: [SalesOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/SalesOrderItem'
 *               deliveryDate:
 *                 type: string
 *                 format: date
 *               specialInstructions:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sales order updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Order not found
 *
 * /orders/{id}/approve:
 *   post:
 *     summary: Approve sales order
 *     tags: [SalesOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sales order approved
 *       400:
 *         description: Cannot approve order
 *       404:
 *         description: Order not found
 *
 * /orders/{id}/cancel:
 *   post:
 *     summary: Cancel sales order
 *     tags: [SalesOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sales order cancelled
 *       400:
 *         description: Cannot cancel order
 *       404:
 *         description: Order not found
 *
 * /orders/{id}/status:
 *   post:
 *     summary: Update sales order status
 *     tags: [SalesOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [processing, shipped, delivered]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sales order status updated successfully
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Order not found
 */
