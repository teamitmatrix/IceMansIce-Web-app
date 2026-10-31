const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const config = require("../config");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      // No default - leave undefined to work with sparse unique index
      validate: {
        validator: function(v) {
          // If email is empty, it's valid (since it's optional)
          if (!v || v.trim() === '') return true;
          // Otherwise, validate format
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please enter a valid email',
      },
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?[0-9]+$/, "Please enter a valid phone number"],
    },
    // Store address as a single string (e.g., "123 Main St, City, ST 12345, USA").
    // Backward compatibility: toJSON will expose address (object) and addressString (raw string).
    address: {
      type: String,
      default: "",
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: ["customer", "driver", "admin"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    refreshTokens: [
      {
        token: String,
        expiresAt: Date,
      },
    ],
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false, // Make it optional during registration
    },
    resetPasswordToken: {
      type: String,
      default: undefined,
    },
    resetPasswordExpires: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// Note: canonical field is address.zipCode; no alias virtual to avoid ambiguity

// Primary indexes
// Use sparse: true to allow multiple empty emails, but enforce uniqueness for non-empty emails
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Compound indexes for common queries
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ isActive: 1, role: 1 });
userSchema.index({ customerId: 1 }, { sparse: true }); // For user-customer relationships

// Search indexes
userSchema.index(
  {
    name: "text",
    email: "text",
  },
  {
    weights: {
      name: 10,
      email: 5,
    },
    name: "user_text_search",
  }
);

// Performance indexes
userSchema.index({ lastLogin: -1 }); // For recent logins
userSchema.index({ createdAt: -1 }); // For user registration tracking
userSchema.index({ updatedAt: -1 }); // For recent updates
userSchema.index({ resetPasswordToken: 1 }, { sparse: true });

// Pre-save hook to convert empty email strings to undefined for sparse index
userSchema.pre("save", async function (next) {
  // Convert empty email to undefined so sparse unique index works properly
  if (this.email !== undefined && (!this.email || this.email.trim() === '')) {
    this.email = undefined;
  }

  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-update hook to convert empty email strings to undefined
userSchema.pre("findOneAndUpdate", function (next) {
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

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateRefreshToken = function () {
  const token = require("crypto").randomBytes(64).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  this.refreshTokens.push({ token, expiresAt });
  return token;
};

userSchema.methods.removeRefreshToken = function (token) {
  this.refreshTokens = this.refreshTokens.filter((rt) => rt.token !== token);
};

userSchema.statics.cleanExpiredTokens = function () {
  return this.updateMany(
    {},
    { $pull: { refreshTokens: { expiresAt: { $lt: new Date() } } } }
  );
};

userSchema.virtual("profile").get(function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    address: this.address,
    role: this.role,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
  };
});

function parseAddressString(addr) {
  // New canonical parsed shape: { street, city, stateZip, country }
  if (!addr || typeof addr !== "string") return { street: "", city: "", stateZip: "", country: "" };

  // Expected new format examples:
  // "123 Main St, Anytown, FL 32145, USA" -> [street, city, stateZip, country]
  // Backward-compatible older strings may have 5 parts; we merge state+zip when present
  const parts = addr.split(",").map((p) => p.trim()).filter(Boolean);

  let street = "", city = "", stateZip = "", country = "";

  if (parts.length >= 4) {
    // If there are 4 or more parts, assume: street, city, stateZip, country
    street = parts[0] || "";
    city = parts[1] || "";
    // If original had separate state and zip (5 parts), merge them
    if (parts.length >= 5) {
      stateZip = [parts[2], parts[3]].filter(Boolean).join(" ");
      country = parts[4] || "";
    } else {
      stateZip = parts[2] || "";
      country = parts[3] || "";
    }
  } else if (parts.length === 3) {
    // street, city, stateZip
    [street, city, stateZip] = parts;
  } else if (parts.length === 2) {
    [street, city] = parts;
  } else if (parts.length === 1) {
    street = parts[0];
  }

  return { street, city, stateZip, country };
}

userSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    // Hide sensitive fields
    delete ret.password;
    delete ret.refreshTokens;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;

    // Expose addressString and keep address as an object for compatibility
    const stored = doc.get("address");
    if (stored && typeof stored === "string") {
      ret.addressString = stored;
      ret.address = parseAddressString(stored);
    } else if (stored && typeof stored === "object") {
      // Legacy documents (pre-migration)
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

module.exports = mongoose.model("User", userSchema);
