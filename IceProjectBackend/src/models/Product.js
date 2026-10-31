const mongoose = require("mongoose");

// Simplified Product schema per new requirements
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    sku: { type: String, trim: true, uppercase: true },
    description: { type: String, maxlength: 1000 },
    price: { type: Number,  min: 0 },
    quantity: { type: Number, required: true, min: 0, default: 0 }, // represents stock
    tax: { type: Number,  min: 0, max: 1, default: 0 },
    unit: { type: String, required: true, enum: ["piece", "box", "case", "pound", "gallon", "liter"], default: "piece" },
    isActive: { type: Boolean, required: true, default: true },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

// Basic indexes for lookups and filtering
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ name: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isActive: 1, name: 1 });
productSchema.index({ quantity: 1 });

// Text search support (name, sku, description)
productSchema.index(
  { name: "text", description: "text", sku: "text" },
  { weights: { name: 10, sku: 8, description: 3 }, name: "product_text_search" }
);

module.exports = mongoose.model("Product", productSchema);
