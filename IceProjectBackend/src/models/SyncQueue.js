const mongoose = require("mongoose");

const syncQueueSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: [
        "Customer",
        "Product",
        "SalesOrder",
        "Invoice",
        "Payment",
        "Route",
        "InventoryMovement",
      ],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    operation: {
      type: String,
      enum: ["create", "update", "delete"],
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    clientId: {
      type: String,
      required: true,
    },
    clientVersion: {
      type: Number,
      required: true,
    },
    serverVersion: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "conflict"],
      default: "pending",
    },
    errorMessage: {
      type: String,
      maxlength: 1000,
    },
    processedAt: {
      type: Date,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    nextRetryAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

syncQueueSchema.index({ entityType: 1, entityId: 1 });
syncQueueSchema.index({ clientId: 1 });
syncQueueSchema.index({ status: 1 });
syncQueueSchema.index({ createdAt: 1 });
syncQueueSchema.index({ nextRetryAt: 1 });
syncQueueSchema.virtual("canRetry").get(function () {
  return this.status === "failed" && this.retryCount < this.maxRetries;
});
syncQueueSchema.methods.markProcessing = function () {
  this.status = "processing";
  return this.save();
};
syncQueueSchema.methods.markCompleted = function () {
  this.status = "completed";
  this.processedAt = new Date();
  return this.save();
};
syncQueueSchema.methods.markFailed = function (errorMessage) {
  this.status = "failed";
  this.errorMessage = errorMessage;
  this.retryCount += 1;

  if (this.canRetry) {
    const backoffMinutes = Math.pow(2, this.retryCount - 1);
    this.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
  }

  return this.save();
};

syncQueueSchema.methods.markConflict = function (errorMessage) {
  this.status = "conflict";
  this.errorMessage = errorMessage;
  this.processedAt = new Date();
  return this.save();
};

syncQueueSchema.statics.findPending = function (clientId, limit = 100) {
  return this.find({
    clientId,
    status: "pending",
  })
    .sort({ createdAt: 1 })
    .limit(limit);
};

syncQueueSchema.statics.findRetryable = function (limit = 100) {
  return this.find({
    status: "failed",
    retryCount: { $lt: "$maxRetries" },
    nextRetryAt: { $lte: new Date() },
  })
    .sort({ nextRetryAt: 1 })
    .limit(limit);
};

syncQueueSchema.statics.findConflicts = function (clientId) {
  return this.find({
    clientId,
    status: "conflict",
  }).sort({ createdAt: -1 });
};

syncQueueSchema.statics.cleanOldCompleted = function (daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    status: "completed",
    processedAt: { $lt: cutoffDate },
  });
};

syncQueueSchema.statics.getSyncStats = async function (
  clientId,
  startDate,
  endDate
) {
  const pipeline = [
    {
      $match: {
        clientId,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: {
          entityType: "$entityType",
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.entityType",
        statuses: {
          $push: {
            status: "$_id.status",
            count: "$count",
          },
        },
        totalCount: { $sum: "$count" },
      },
    },
    {
      $sort: { totalCount: -1 },
    },
  ];

  return this.aggregate(pipeline);
};

syncQueueSchema.set("toJSON", {
  virtuals: true,
});

module.exports = mongoose.model("SyncQueue", syncQueueSchema);
