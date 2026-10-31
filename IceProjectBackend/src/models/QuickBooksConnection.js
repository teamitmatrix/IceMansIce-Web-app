const mongoose = require("mongoose");

const quickBooksConnectionSchema = new mongoose.Schema(
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
      required: true,
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
    lastError: {
      type: String,
    },
    syncSettings: {
      autoSyncCustomers: {
        type: Boolean,
        default: true,
      },
      autoSyncInvoices: {
        type: Boolean,
        default: true,
      },
      autoSyncProducts: {
        type: Boolean,
        default: true,
      },
      autoSyncPayments: {
        type: Boolean,
        default: true,
      },
      syncInterval: {
        type: Number,
        default: 3600, // 1 hour in seconds
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
quickBooksConnectionSchema.index({ userId: 1 }, { unique: true });
quickBooksConnectionSchema.index({ companyId: 1 });
quickBooksConnectionSchema.index({ isActive: 1 });

// Virtual for checking if token is expired
quickBooksConnectionSchema.virtual("isTokenExpired").get(function () {
  return this.tokenExpiresAt && this.tokenExpiresAt <= new Date();
});

// Method to check if connection is valid
quickBooksConnectionSchema.methods.isValid = function () {
  return this.isActive && !this.isTokenExpired;
};

// Static method to find active connection for user
quickBooksConnectionSchema.statics.findActiveByUserId = function (userId) {
  return this.findOne({ userId, isActive: true });
};

// Static method to find connection by company ID
quickBooksConnectionSchema.statics.findByCompanyId = function (companyId) {
  return this.findOne({ companyId, isActive: true });
};

module.exports = mongoose.model(
  "QuickBooksConnection",
  quickBooksConnectionSchema
);
