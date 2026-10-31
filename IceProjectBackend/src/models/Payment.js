const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    method: {
      type: String,
      enum: [
        "cash",
        "check",
        "credit_card",
        "debit_card",
        "ach",
        "charge_account",
        "other",
      ],
      required: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    checkNumber: {
      type: String,
      trim: true,
    },
    cardLast4: {
      type: String,
      trim: true,
      maxlength: 4,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded", "cancelled"],
      default: "pending",
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    collectedByDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    driverLocation: {
      latitude: Number,
      longitude: Number,
      timestamp: Date,
    },
    receiptNumber: {
      type: String,
      trim: true,
    },
    isDriverCollected: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: String,
      default: "dummy",
    },
    providerResponse: {
      type: mongoose.Schema.Types.Mixed,
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
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ salesOrderId: 1 });
paymentSchema.index({ method: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ receivedAt: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.virtual("methodDisplay").get(function () {
  const methodMap = {
    cash: "Cash",
    check: "Check",
    credit_card: "Credit Card",
    debit_card: "Debit Card",
    ach: "ACH",
    charge_account: "Charge Account",
    other: "Other",
  };
  return methodMap[this.method] || this.method;
});

paymentSchema.virtual("maskedReference").get(function () {
  if (!this.reference) return "";
  if (this.method === "credit_card" || this.method === "debit_card") {
    return `****${this.cardLast4 || "****"}`;
  }
  return this.reference;
});

paymentSchema.methods.markCompleted = function () {
  this.status = "completed";
  this.processedAt = new Date();
  return this.save();
};

paymentSchema.methods.markFailed = function (reason) {
  this.status = "failed";
  this.notes = reason;
  return this.save();
};

paymentSchema.methods.refund = function (amount, reason) {
  this.status = "refunded";
  this.notes = reason;
  return this.save();
};

paymentSchema.statics.findByCustomer = function (customerId) {
  return this.find({ customerId }).sort({ receivedAt: -1 });
};

paymentSchema.statics.findByInvoice = function (invoiceId) {
  return this.find({ invoiceId }).sort({ receivedAt: -1 });
};

paymentSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    receivedAt: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ receivedAt: -1 });
};

paymentSchema.statics.getPaymentSummary = async function (startDate, endDate) {
  const pipeline = [
    {
      $match: {
        receivedAt: {
          $gte: startDate,
          $lte: endDate,
        },
        status: "completed",
      },
    },
    {
      $group: {
        _id: "$method",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { totalAmount: -1 },
    },
  ];

  return this.aggregate(pipeline);
};

paymentSchema.set("toJSON", {
  virtuals: true,
});

module.exports = mongoose.model("Payment", paymentSchema);
