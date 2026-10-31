const mongoose = require("mongoose");

const quickBooksConnectionTableSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    tokenExpiresAt: {
      type: Date,
      required: true,
    },
    realmId: {
      type: String,
      required: true,
    },
    companyName: {
      type: String,
      default: "QuickBooks Company",
    },
    environment: {
      type: String,
      enum: ["sandbox", "production"],
      default: "sandbox",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSyncAt: {
      type: Date,
    },
    // Per-entity sync checkpoints for delta sync
    lastCustomerPullAt: {
      type: Date,
    },
    lastCustomerPushAt: {
      type: Date,
    },
    // Invoice-specific delta checkpoints
    lastInvoicePullAt: {
      type: Date,
    },
    lastInvoicePushAt: {
      type: Date,
    },
    syncStatus: {
      type: String,
      enum: ["pending", "syncing", "completed", "failed"],
      default: "pending",
    },
    syncHistory: [
      {
        syncType: {
          type: String,
          enum: ["customers", "invoices", "products", "full"],
        },
        status: {
          type: String,
          enum: ["success", "failed", "partial"],
        },
        syncedAt: {
          type: Date,
          default: Date.now,
        },
        recordsCount: {
          type: Number,
          default: 0,
        },
        errorMessage: String,
      },
    ],
    webhookUrl: {
      type: String,
    },
    webhookSecret: {
      type: String,
    },
    preferences: {
      autoSync: {
        type: Boolean,
        default: false,
      },
      syncInterval: {
        type: Number,
        default: 3600, // 1 hour in seconds
      },
      syncTypes: [
        {
          type: String,
          enum: ["customers", "invoices", "products"],
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
quickBooksConnectionTableSchema.index({ userId: 1 }, { unique: true });
quickBooksConnectionTableSchema.index({ companyId: 1 });
quickBooksConnectionTableSchema.index({ isActive: 1 });
quickBooksConnectionTableSchema.index({ syncStatus: 1 });
quickBooksConnectionTableSchema.index({ lastSyncAt: 1 });
quickBooksConnectionTableSchema.index({ lastCustomerPullAt: 1 });
quickBooksConnectionTableSchema.index({ lastCustomerPushAt: 1 });
quickBooksConnectionTableSchema.index({ lastInvoicePullAt: 1 });
quickBooksConnectionTableSchema.index({ lastInvoicePushAt: 1 });

// Virtual for checking if token is expired
quickBooksConnectionTableSchema.virtual("isTokenExpired").get(function () {
  return this.tokenExpiresAt && this.tokenExpiresAt <= new Date();
});

// Virtual for checking if sync is needed
quickBooksConnectionTableSchema.virtual("needsSync").get(function () {
  if (!this.lastSyncAt) return true;
  const now = new Date();
  const timeSinceLastSync = now - this.lastSyncAt;
  return timeSinceLastSync > this.preferences.syncInterval * 1000;
});

// Static method to find active connection by userId
quickBooksConnectionTableSchema.statics.findActiveByUserId = async function (
  userId
) {
  return this.findOne({ userId, isActive: true });
};

// Static method to find connections that need sync
quickBooksConnectionTableSchema.statics.findNeedingSync = async function () {
  return this.find({
    isActive: true,
    $or: [
      { lastSyncAt: { $exists: false } },
      {
        lastSyncAt: {
          $lt: new Date(Date.now() - 3600 * 1000), // 1 hour ago
        },
      },
    ],
  });
};

// Method to add sync history entry
quickBooksConnectionTableSchema.methods.addSyncHistory = function (
  syncType,
  status,
  recordsCount = 0,
  errorMessage = null
) {
  this.syncHistory.push({
    syncType,
    status,
    recordsCount,
    errorMessage,
  });

  // Keep only last 50 sync history entries
  if (this.syncHistory.length > 50) {
    this.syncHistory = this.syncHistory.slice(-50);
  }

  this.lastSyncAt = new Date();
  this.syncStatus = status === "success" ? "completed" : "failed";

  return this.save();
};

// Method to update sync status
quickBooksConnectionTableSchema.methods.updateSyncStatus = function (status) {
  this.syncStatus = status;
  return this.save();
};

const QuickBooksConnectionTable = mongoose.model(
  "QuickBooksConnectionTable",
  quickBooksConnectionTableSchema
);

module.exports = QuickBooksConnectionTable;
