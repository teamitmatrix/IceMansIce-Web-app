const mongoose = require("mongoose");

const inventoryMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    delta: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "purchase",
        "sale",
        "adjustment",
        "transfer",
        "damage",
        "expiry",
        "return",
        "correction",
        "initial_stock",
        "cycle_count",
      ],
      required: true,
    },
    locationType: {
      type: String,
      enum: ["global", "warehouse", "truck"],
      default: "global",
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "locationModel",
    },
    locationModel: {
      type: String,
      enum: ["Warehouse", "Truck"],
      required: function () {
        return this.locationType !== "global";
      },
    },
    referenceType: {
      type: String,
      enum: [
        "sales_order",
        "invoice",
        "purchase_order",
        "transfer",
        "adjustment",
      ],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "referenceModel",
    },
    referenceModel: {
      type: String,
      enum: [
        "SalesOrder",
        "Invoice",
        "PurchaseOrder",
        "Transfer",
        "Adjustment",
      ],
    },
    quantityBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    quantityAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    unitCost: {
      type: Number,
      min: 0,
    },
    totalValue: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
inventoryMovementSchema.index({ productId: 1 });
inventoryMovementSchema.index({ reason: 1 });
inventoryMovementSchema.index({ locationType: 1 });
inventoryMovementSchema.index({ locationId: 1 });
inventoryMovementSchema.index({ referenceType: 1 });
inventoryMovementSchema.index({ referenceId: 1 });
inventoryMovementSchema.index({ performedBy: 1 });
inventoryMovementSchema.index({ createdAt: 1 });

inventoryMovementSchema.virtual("movementType").get(function () {
  return this.delta > 0 ? "in" : "out";
});

inventoryMovementSchema.virtual("absoluteDelta").get(function () {
  return Math.abs(this.delta);
});

inventoryMovementSchema.methods.calculateValue = function () {
  if (this.unitCost) {
    this.totalValue = this.absoluteDelta * this.unitCost;
  }
  return this;
};

inventoryMovementSchema.statics.findByProduct = function (
  productId,
  options = {}
) {
  const query = { productId };

  if (options.startDate) {
    query.createdAt = { $gte: options.startDate };
  }
  if (options.endDate) {
    query.createdAt = { ...query.createdAt, $lte: options.endDate };
  }
  if (options.reason) {
    query.reason = options.reason;
  }

  return this.find(query)
    .populate("locationId", "name code")
    .populate("performedBy", "name")
    .sort({ createdAt: -1 });
};

inventoryMovementSchema.statics.findByLocation = function (
  locationType,
  locationId,
  options = {}
) {
  const query = { locationType, locationId };

  if (options.startDate) {
    query.createdAt = { $gte: options.startDate };
  }
  if (options.endDate) {
    query.createdAt = { ...query.createdAt, $lte: options.endDate };
  }

  return this.find(query)
    .populate("productId", "name sku")
    .populate("performedBy", "name")
    .sort({ createdAt: -1 });
};

inventoryMovementSchema.statics.getInventorySummary = async function (
  startDate,
  endDate
) {
  const pipeline = [
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: {
          productId: "$productId",
          reason: "$reason",
          locationType: "$locationType",
        },
        totalDelta: { $sum: "$delta" },
        totalValue: { $sum: "$totalValue" },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: {
          productId: "$_id.productId",
          locationType: "$_id.locationType",
        },
        movements: {
          $push: {
            reason: "$_id.reason",
            totalDelta: "$totalDelta",
            totalValue: "$totalValue",
            count: "$count",
          },
        },
        netDelta: { $sum: "$totalDelta" },
        totalValue: { $sum: "$totalValue" },
      },
    },
    {
      $sort: { totalValue: -1 },
    },
  ];

  return this.aggregate(pipeline);
};

inventoryMovementSchema.statics.getReasonsSummary = async function (
  startDate,
  endDate
) {
  const pipeline = [
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: "$reason",
        totalDelta: { $sum: "$delta" },
        totalValue: { $sum: "$totalValue" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { totalValue: -1 },
    },
  ];

  return this.aggregate(pipeline);
};

inventoryMovementSchema.set("toJSON", {
  virtuals: true,
});

module.exports = mongoose.model("InventoryMovement", inventoryMovementSchema);
