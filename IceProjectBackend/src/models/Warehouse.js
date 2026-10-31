const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 10,
    },
    // Store address as a single string
    address: {
      type: String,
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      maxlength: 1000,
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

warehouseSchema.index({ code: 1 }, { unique: true });
warehouseSchema.index({ name: 1 });
warehouseSchema.index({ isActive: 1 });

warehouseSchema.virtual("fullAddress").get(function () {
  if (!this.address) return "";
  if (typeof this.address === "string") return this.address;
  const parts = [this.address.street, this.address.city, this.address.state, this.address.zipCode].filter(Boolean);
  return parts.join(", ");
});

// Note: canonical field is address.zipCode; no alias virtual to avoid ambiguity

warehouseSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ name: 1 });
};

function parseAddressString(addr) {
  if (!addr || typeof addr !== "string") return { street: "", city: "", state: "", zipCode: "", country: "" };
  
  // Expected format: "street, city, state, zipCode, country"
  const parts = addr.split(",").map((p) => p.trim()).filter(Boolean);
  
  let street = "", city = "", state = "", zipCode = "", country = "";
  
  if (parts.length >= 5) {
    // Full address with all 5 components
    [street, city, state, zipCode, country] = parts;
  } else if (parts.length === 4) {
    // Missing one component, try to determine which
    // Check if last part looks like a country (typically longer, no numbers)
    if (!/\d/.test(parts[3]) && parts[3].length > 2) {
      // Likely: street, city, state, country (no zipCode)
      [street, city, state, country] = parts;
    } else {
      // Likely: street, city, state, zipCode (no country)
      [street, city, state, zipCode] = parts;
    }
  } else if (parts.length === 3) {
    [street, city, state] = parts;
  } else if (parts.length === 2) {
    [street, city] = parts;
  } else if (parts.length === 1) {
    street = parts[0];
  }
  
  return { street, city, state, zipCode, country };
}

warehouseSchema.set("toJSON", {
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
      ret.address = legacy;
    } else {
      ret.addressString = "";
      ret.address = { street: "", city: "", state: "", zipCode: "", country: "" };
    }
    return ret;
  },
});

module.exports = mongoose.model("Warehouse", warehouseSchema);
