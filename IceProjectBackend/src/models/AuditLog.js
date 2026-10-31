const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "create",
        "update",
        "delete",
        "login",
        "logout",
        "approve",
        "reject",
        "assign",
        "unassign",
        "ship",
        "deliver",
        "payment",
        "refund",
        "sync",
        "export",
        "import",
        "adjustment",
        "transfer",
      ],
    },
    entityType: {
      type: String,
      required: true,
      enum: [
        "User",
        "Customer",
        "Product",
        "SalesOrder",
        "Invoice",
        "Payment",
        "Route",
        "Truck",
        "Warehouse",
        "InventoryMovement",
        "SyncQueue",
      ],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    diff: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    sessionId: {
      type: String,
      trim: true,
    },
    clientId: {
      type: String,
      sparse: true,
    },
    clientVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);
auditLogSchema.index({ actorId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ entityType: 1 });
auditLogSchema.index({ entityId: 1 });
auditLogSchema.index({ createdAt: 1 });

auditLogSchema.virtual("actorName").get(function () {
  return this.actorId ? this.actorId.name : "System";
});

auditLogSchema.virtual("actionDisplay").get(function () {
  const actionMap = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
    login: "Logged In",
    logout: "Logged Out",
    approve: "Approved",
    reject: "Rejected",
    assign: "Assigned",
    unassign: "Unassigned",
    ship: "Shipped",
    deliver: "Delivered",
    payment: "Payment",
    refund: "Refunded",
    sync: "Synced",
    export: "Exported",
    import: "Imported",
    adjustment: "Adjusted",
    transfer: "Transferred",
  };
  return actionMap[this.action] || this.action;
});

auditLogSchema.statics.logAction = function (data) {
  return this.create({
    actorId: data.actorId,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    diff: data.diff || {},
    metadata: data.metadata || {},
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    sessionId: data.sessionId,
    clientId: data.clientId,
    clientVersion: data.clientVersion,
  });
};

auditLogSchema.statics.findByEntity = function (
  entityType,
  entityId,
  options = {}
) {
  const query = { entityType, entityId };

  if (options.startDate) {
    query.createdAt = { $gte: options.startDate };
  }
  if (options.endDate) {
    query.createdAt = { ...query.createdAt, $lte: options.endDate };
  }
  if (options.action) {
    query.action = options.action;
  }

  return this.find(query)
    .populate("actorId", "name email role")
    .sort({ createdAt: -1 });
};

auditLogSchema.statics.findByActor = function (actorId, options = {}) {
  const query = { actorId };

  if (options.startDate) {
    query.createdAt = { $gte: options.startDate };
  }
  if (options.endDate) {
    query.createdAt = { ...query.createdAt, $lte: options.endDate };
  }

  return this.find(query)
    .populate("actorId", "name email role")
    .sort({ createdAt: -1 });
};

auditLogSchema.statics.getAuditSummary = async function (startDate, endDate) {
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
          action: "$action",
          entityType: "$entityType",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.entityType",
        actions: {
          $push: {
            action: "$_id.action",
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

auditLogSchema.statics.getUserActivitySummary = async function (
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
        _id: "$actorId",
        actionCount: { $sum: 1 },
        actions: { $addToSet: "$action" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        actorId: "$_id",
        actorName: "$user.name",
        actorEmail: "$user.email",
        actorRole: "$user.role",
        actionCount: 1,
        actions: 1,
      },
    },
    {
      $sort: { actionCount: -1 },
    },
  ];

  return this.aggregate(pipeline);
};

auditLogSchema.set("toJSON", {
  virtuals: true,
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
