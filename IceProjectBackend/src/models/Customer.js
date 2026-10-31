const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    phone: {
      type: String,
      trim: true,
    },
    // Store address as a single string
    address: {
      type: String,
      default: "",
      trim: true,
    },
    balance: {
      type: Number,
      default: 0,

    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentTerms: {
      type: String,
      enum: ["immediate", "net15", "net30", "net60"],
      default: "immediate",
    },
    taxExempt: {
      type: Boolean,
      default: false,
    },
    taxId: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
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
customerSchema.index({ name: 1 });
customerSchema.index({ userId: 1 }, { sparse: true });
customerSchema.index({ email: 1 }, { sparse: true });

// Compound indexes for common queries
customerSchema.index({ isActive: 1 });
customerSchema.index({ isActive: 1, name: 1 });
customerSchema.index({ paymentTerms: 1, isActive: 1 });

// Financial indexes
customerSchema.index({ balance: 1 }); // For outstanding balances
customerSchema.index({ creditLimit: 1 });
customerSchema.index({ isActive: 1, balance: 1 }); // Active customers with balances

// Search indexes
customerSchema.index(
  {
    name: "text",
    email: "text",
  },
  {
    weights: {
      name: 10,
      email: 5,
    },
    name: "customer_text_search",
  }
);

// Performance indexes
customerSchema.index({ createdAt: -1 }); // For recent customers
customerSchema.index({ updatedAt: -1 }); // For recent updates
customerSchema.index({ tags: 1 }); // For tag-based filtering
// email index already declared above with sparse: true
// phone index retained below for lookup
customerSchema.index({ phone: 1 });

// Pre-save hook to convert empty email strings to undefined for sparse index
customerSchema.pre("save", function (next) {
  // Convert empty email to undefined so sparse index works properly
  if (this.email !== undefined && (!this.email || this.email.trim() === '')) {
    this.email = undefined;
  }
  next();
});

// Pre-update hook to convert empty email strings to undefined
customerSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  
  // Handle both direct update and $set update
  if (update.email !== undefined && (!update.email || update.email.trim() === '')) {
    update.email = undefined;
  }
  if (update.$set && update.$set.email !== undefined && (!update.$set.email || update.$set.email.trim() === '')) {
    update.$set.email = undefined;
  }
  
  next();
});

customerSchema.virtual("fullAddress").get(function () {
  if (!this.address) return "";
  if (typeof this.address === "string") return this.address;
  // Legacy documents with object
  const parts = [this.address.street, this.address.city, this.address.state, this.address.zipCode].filter(Boolean);
  return parts.join(", ");
});

// Note: canonical field is address.zipCode; no alias virtual to avoid ambiguity

customerSchema.virtual("accountStatus").get(function () {
  if (this.balance <= 0) return "current";
  if (this.balance > this.creditLimit) return "over_limit";
  return "past_due";
});

customerSchema.methods.updateBalance = function (amount) {
  this.balance += amount;
  return this.save();
};

customerSchema.methods.canPurchase = function (amount) {
  if (this.paymentTerms === "immediate") return true;
  return this.balance + amount <= this.creditLimit;
};

customerSchema.statics.search = function (term) {
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: term, $options: "i" } },
          { email: { $regex: term, $options: "i" } },
          { phone: { $regex: term, $options: "i" } },
        ],
      },
    ],
  }).sort({ name: 1 });
};

function parseAddressString(addr) {
  // Returns { street, city, stateZip, country }
  if (!addr || typeof addr !== "string") return { street: "", city: "", stateZip: "", country: "" };
  const parts = addr.split(",").map((p) => p.trim()).filter(Boolean);
  let street = "", city = "", stateZip = "", country = "";
  if (parts.length >= 4) {
    street = parts[0] || "";
    city = parts[1] || "";
    if (parts.length >= 5) {
      stateZip = [parts[2], parts[3]].filter(Boolean).join(" ");
      country = parts[4] || "";
    } else {
      stateZip = parts[2] || "";
      country = parts[3] || "";
    }
  } else if (parts.length === 3) {
    [street, city, stateZip] = parts;
  } else if (parts.length === 2) {
    [street, city] = parts;
  } else if (parts.length === 1) {
    street = parts[0];
  }
  return { street, city, stateZip, country };
}

customerSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    const stored = doc.get("address");
    if (stored && typeof stored === "string") {
      ret.addressString = stored;
      ret.address = parseAddressString(stored);
    } else if (stored && typeof stored === "object") {
      const legacy = stored || {};
      const joined = [legacy.street, legacy.city, legacy.state, legacy.zipCode, legacy.country].filter(Boolean).join(", ");
      ret.addressString = joined;
      ret.address = {
        street: legacy.street || "",
        city: legacy.city || "",
        stateZip: [legacy.state, legacy.zipCode].filter(Boolean).join(" ").trim(),
        country: legacy.country || "",
      };
    } else {
      ret.addressString = "";
      ret.address = { street: "", city: "", stateZip: "", country: "" };
    }
    return ret;
  },
});

module.exports = mongoose.model("Customer", customerSchema);
