const mongoose = require("mongoose");
// Configure a starting baseline for invoice numbers. This ensures that
// after data resets or fresh installs, invoice numbering starts from a
// specific sequence. You can override via env STARTING_INVOICE_NUMBER.
const STARTING_INVOICE_NUMBER = parseInt(process.env.STARTING_INVOICE_NUMBER || "20350000", 10);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: Number,
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
    },
    items: [
      {
        // For driver-created/manual invoices we may not have a productId or sku.
        // Keep fields for backward compatibility but relax requirements.
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: false,
        },
        // Legacy name field (from product). Optional now.
        name: {
          type: String,
          required: false,
        },
        // New explicit productName field for manual entries (required if no name)
        productName: {
          type: String,
          required: false,
          trim: true,
        },
        sku: {
          type: String,
          required: false,
          default: "",
        },
        quantity: {
          type: Number,
          required: true,
          // Removed min: 1 to allow negative quantities for credits/returns
        },
        unitPrice: {
          type: Number,
          required: true,
          // Removed min: 0 to allow negative unit prices for credits/returns
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
          // Removed min: 0 to allow negative line totals for credits/returns
        },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      // Removed min: 0 to allow negative subtotals for credits/returns
    },
    taxAmount: {
      type: Number,
      default: 0,
      // Removed min: 0 to allow negative tax amounts for credits/returns
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      // Removed min: 0 to allow negative totals for credits/returns
    },
    amountPaid: {
      type: Number,
      default: 0,
      // Removed min: 0 to allow negative amounts for refunds
    },
    balance: {
      type: Number,
      default: 0,
      // Removed min: 0 to allow negative balances for overpayments/credits
    },
    status: {
      type: String,
      enum: [
        "draft",
        "pending",
        "approved",
        "sent",
        "partial",
        "paid",
        "overdue",
        "cancelled",
      ],
      default: "draft",
    },
    dueDate: {
      type: Date,
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    paymentTerms: {
      type: String,
      enum: ["due on cash", "immediate", "net7", "net10", "net15", "net30", "net60"],
      default: "immediate",
    },
    poNumber: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "online", "check", "charged"],
      required: false,
    },
    checkNumber: {
      type: String,
      required: false,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    deliveryInstructions: {
      type: String,
      maxlength: 500,
    },
    createdByDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isPrintedByDriver: {
      type: Boolean,
      default: false,
    },
    driverPrintInfo: {
      printerName: String,
      printedAt: Date,
      deviceInfo: String,
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
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ customerId: 1 });
invoiceSchema.index({ status: 1 });

// Compound indexes for common queries
invoiceSchema.index({ customerId: 1, status: 1 });
invoiceSchema.index({ status: 1, issueDate: -1 });
invoiceSchema.index({ customerId: 1, issueDate: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 }); // For overdue invoices
// paymentStatus is a virtual; do not index

// Date-based queries
invoiceSchema.index({ issueDate: -1 });
invoiceSchema.index({ dueDate: 1 }); 
// dueDate already indexed above as part of compound
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ updatedAt: -1 });

// Financial queries
invoiceSchema.index({ total: 1 });
invoiceSchema.index({ amountPaid: 1 });
invoiceSchema.index({ balance: 1 }); // For outstanding balances

// Search indexes
invoiceSchema.index(
  {
    "customerId.name": "text",
    "items.productName": "text",
  },
  {
    weights: {
      "customerId.name": 5,
      "items.productName": 3,
    },
    name: "invoice_text_search",
  }
);

// Performance indexes
// Ensure only one invoice per sales order and allow quick lookups
invoiceSchema.index({ salesOrderId: 1 }, { unique: true, sparse: true });
// isPaid is not a real field; do not index

invoiceSchema.virtual("paymentStatus").get(function () {
  if (this.status === "paid") return "paid";
  if (this.status === "cancelled") return "cancelled";
  if (this.balance <= 0) return "paid";
  if (this.dueDate && new Date() > this.dueDate) return "overdue";
  return "pending";
});

invoiceSchema.virtual("daysOverdue").get(function () {
  if (!this.dueDate || this.balance <= 0) return 0;
  const today = new Date();
  const due = new Date(this.dueDate);
  const diffTime = today - due;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

invoiceSchema.methods.calculateTotals = function () {
  this.subtotal = this.items.reduce((sum, item) => {
    const lineTotal = item.unitPrice * item.quantity - (item.discount || 0);
    return sum + lineTotal;
  }, 0);

  this.taxAmount = this.items.reduce((sum, item) => {
    const lineTotal = item.unitPrice * item.quantity - (item.discount || 0);
    return sum + lineTotal * (item.taxRate || 0);
  }, 0);

  // Ensure discountAmount is a number
  this.discountAmount = this.discountAmount || 0;
  this.amountPaid = this.amountPaid || 0;

  this.total = this.subtotal + this.taxAmount - this.discountAmount;
  this.balance = this.total - this.amountPaid;

  return this;
};

invoiceSchema.methods.recordPayment = function (amount) {
  this.amountPaid += amount;
  this.balance = this.total - this.amountPaid;

  if (this.balance <= 0) {
    this.status = "paid";
  }

  return this.save();
};

invoiceSchema.methods.setDueDate = function () {
  if (this.paymentTerms === "immediate") {
    this.dueDate = this.issueDate;
  } else {
    const dueDate = new Date(this.issueDate);
    const days = parseInt(this.paymentTerms.replace("net", ""));
    dueDate.setDate(dueDate.getDate() + days);
    this.dueDate = dueDate;
  }

  return this;
};

invoiceSchema.statics.generateInvoiceNumber = async function () {
  try {
    const lastInvoice = await this.findOne({ 
      invoiceNumber: { $type: "number", $ne: null } 
    }).sort({ invoiceNumber: -1 });
    
    let lastNumber = 0;
    
    if (lastInvoice && typeof lastInvoice.invoiceNumber === 'number' && !isNaN(lastInvoice.invoiceNumber)) {
      lastNumber = lastInvoice.invoiceNumber;
    } else {
      // If no valid invoice found, check for any invoices and use count + 1
      const count = await this.countDocuments();
      lastNumber = count;
    }
    // Enforce the configured baseline so that the next generated number
    // is at least STARTING_INVOICE_NUMBER + 1
    lastNumber = Math.max(lastNumber, STARTING_INVOICE_NUMBER);

    const newNumber = lastNumber + 1;
    
    // Additional validation to ensure we're returning a valid number
    if (isNaN(newNumber) || !isFinite(newNumber) || newNumber < 1) {
      console.error('Invalid invoice number generated:', { lastNumber, newNumber, lastInvoice });
      return 1; // Fallback to 1 if something goes wrong
    }
    
    console.log('Generated invoice number:', { lastNumber, newNumber });
    return newNumber;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    return 1; // Fallback to 1 if there's an error
  }
};

invoiceSchema.statics.findOverdue = function () {
  return this.find({
    status: { $nin: ["paid", "cancelled"] },
    dueDate: { $lt: new Date() },
    balance: { $gt: 0 },
  }).populate("customerId", "name email phone");
};

invoiceSchema.statics.findByCustomer = function (customerId) {
  return this.find({ customerId }).sort({ issueDate: -1 });
};

invoiceSchema.set("toJSON", {
  virtuals: true,
});

module.exports = mongoose.model("Invoice", invoiceSchema);
