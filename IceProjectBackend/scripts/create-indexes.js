#!/usr/bin/env node

/**
 * Database Index Creation Script
 *
 * This script creates optimized indexes for better query performance.
 * Run this script after deploying the application to ensure all indexes are created.
 */

const mongoose = require("mongoose");
const config = require("../src/config");

// Import all models to ensure schemas are registered
require("../src/models/User");
require("../src/models/Customer");
require("../src/models/Product");
require("../src/models/SalesOrder");
require("../src/models/Invoice");
require("../src/models/Payment");
require("../src/models/InventoryMovement");
require("../src/models/Route");
require("../src/models/Warehouse");
require("../src/models/Truck");
require("../src/models/SyncQueue");
require("../src/models/AuditLog");
require("../src/models/DriverSession");

async function createIndexes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(config.database.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;

    console.log("\nCreating indexes...\n");

    // Product indexes
    console.log("Creating Product indexes...");
    await db.collection("products").createIndex({ sku: 1 }, { unique: true });
    await db.collection("products").createIndex({ name: 1 });
    await db.collection("products").createIndex({ isActive: 1 });
    await db.collection("products").createIndex({ isActive: 1, name: 1 });
    await db.collection("products").createIndex(
      {
        name: "text",
        description: "text",
        sku: "text",
      },
      {
        weights: {
          name: 10,
          sku: 8,
          description: 3,
        },
        name: "product_text_search",
      }
    );
    await db.collection("products").createIndex({ quantity: 1 });
    await db.collection("products").createIndex({ minStock: 1, quantity: 1 });
    await db
      .collection("products")
      .createIndex({ isActive: 1, quantity: 1, minStock: 1 });
    await db.collection("products").createIndex({ createdAt: -1 });
    await db.collection("products").createIndex({ updatedAt: -1 });
    await db.collection("products").createIndex({ price: 1 });
    await db.collection("products").createIndex({ tags: 1 });
    console.log("✓ Product indexes created");

    // SalesOrder indexes
    console.log("Creating SalesOrder indexes...");
    await db
      .collection("salesorders")
      .createIndex({ orderNumber: 1 }, { unique: true });
    await db.collection("salesorders").createIndex({ customerId: 1 });
    await db.collection("salesorders").createIndex({ status: 1 });
    await db
      .collection("salesorders")
      .createIndex({ customerId: 1, status: 1 });
    await db
      .collection("salesorders")
      .createIndex({ status: 1, orderDate: -1 });
    await db
      .collection("salesorders")
      .createIndex({ customerId: 1, orderDate: -1 });
    await db
      .collection("salesorders")
      .createIndex({ assignedDriver: 1, status: 1 });
    await db
      .collection("salesorders")
      .createIndex({ createdByDriver: 1, status: 1 });
    await db.collection("salesorders").createIndex({ orderDate: -1 });
    await db
      .collection("salesorders")
      .createIndex({ requestedDeliveryDate: 1 });
    await db.collection("salesorders").createIndex({ createdAt: -1 });
    await db.collection("salesorders").createIndex({ updatedAt: -1 });
    await db.collection("salesorders").createIndex({ assignedDriver: 1 });
    await db.collection("salesorders").createIndex({ createdByDriver: 1 });
    await db.collection("salesorders").createIndex(
      {
        orderNumber: "text",
        "customerId.name": "text",
        "items.productName": "text",
      },
      {
        weights: {
          orderNumber: 10,
          "customerId.name": 5,
          "items.productName": 3,
        },
        name: "order_text_search",
      }
    );
    await db.collection("salesorders").createIndex({ total: 1 });
    await db
      .collection("salesorders")
      .createIndex({ paymentStatus: 1, status: 1 });
    console.log("✓ SalesOrder indexes created");

    // Invoice indexes
    console.log("Creating Invoice indexes...");
    await db
      .collection("invoices")
      .createIndex({ invoiceNumber: 1 }, { unique: true });
    await db.collection("invoices").createIndex({ customerId: 1 });
    await db.collection("invoices").createIndex({ status: 1 });
    await db.collection("invoices").createIndex({ customerId: 1, status: 1 });
    await db.collection("invoices").createIndex({ status: 1, issueDate: -1 });
    await db
      .collection("invoices")
      .createIndex({ customerId: 1, issueDate: -1 });
    await db.collection("invoices").createIndex({ status: 1, dueDate: 1 });
    await db
      .collection("invoices")
      .createIndex({ paymentStatus: 1, status: 1 });
    await db.collection("invoices").createIndex({ issueDate: -1 });
    await db.collection("invoices").createIndex({ dueDate: 1 });
    await db.collection("invoices").createIndex({ createdAt: -1 });
    await db.collection("invoices").createIndex({ updatedAt: -1 });
    await db.collection("invoices").createIndex({ total: 1 });
    await db.collection("invoices").createIndex({ amountPaid: 1 });
    await db.collection("invoices").createIndex({ balance: 1 });
    await db.collection("invoices").createIndex(
      {
        invoiceNumber: "text",
        "customerId.name": "text",
        "items.productName": "text",
      },
      {
        weights: {
          invoiceNumber: 10,
          "customerId.name": 5,
          "items.productName": 3,
        },
        name: "invoice_text_search",
      }
    );
    await db.collection("invoices").createIndex({ salesOrderId: 1 });
    await db.collection("invoices").createIndex({ isPaid: 1, dueDate: 1 });
    console.log("✓ Invoice indexes created");

    // User indexes
    console.log("Creating User indexes...");
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("users").createIndex({ role: 1 });
    await db.collection("users").createIndex({ isActive: 1 });
    await db.collection("users").createIndex({ role: 1, isActive: 1 });
    await db.collection("users").createIndex({ isActive: 1, role: 1 });
    await db
      .collection("users")
      .createIndex({ customerId: 1 }, { sparse: true });
    await db.collection("users").createIndex(
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
    await db.collection("users").createIndex({ lastLogin: -1 });
    await db.collection("users").createIndex({ createdAt: -1 });
    await db.collection("users").createIndex({ updatedAt: -1 });
    console.log("✓ User indexes created");

    // Customer indexes
    console.log("Creating Customer indexes...");
    await db.collection("customers").createIndex({ name: 1 });
    // Note: userId index is already defined in the Customer schema with sparse: true
    await db
      .collection("customers")
      .createIndex({ email: 1 }, { sparse: true });
    await db.collection("customers").createIndex({ isActive: 1 });
    await db.collection("customers").createIndex({ isActive: 1, name: 1 });
    await db
      .collection("customers")
      .createIndex({ paymentTerms: 1, isActive: 1 });
    await db.collection("customers").createIndex({ balance: 1 });
    await db.collection("customers").createIndex({ creditLimit: 1 });
    await db.collection("customers").createIndex({ isActive: 1, balance: 1 });
    await db.collection("customers").createIndex(
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
    await db.collection("customers").createIndex({ createdAt: -1 });
    await db.collection("customers").createIndex({ updatedAt: -1 });
    await db.collection("customers").createIndex({ tags: 1 });
    console.log("✓ Customer indexes created");

    // Payment indexes
    console.log("Creating Payment indexes...");
    await db.collection("payments").createIndex({ invoiceId: 1 });
    await db.collection("payments").createIndex({ customerId: 1 });
    await db.collection("payments").createIndex({ paymentDate: -1 });
    await db.collection("payments").createIndex({ method: 1 });
    await db.collection("payments").createIndex({ status: 1 });
    console.log("✓ Payment indexes created");

    // Route indexes
    console.log("Creating Route indexes...");
    await db.collection("routes").createIndex({ driverId: 1 });
    await db.collection("routes").createIndex({ status: 1 });
    await db.collection("routes").createIndex({ date: -1 });
    await db.collection("routes").createIndex({ driverId: 1, status: 1 });
    await db.collection("routes").createIndex({ driverId: 1, date: -1 });
    console.log("✓ Route indexes created");

    // AuditLog indexes
    console.log("Creating AuditLog indexes...");
    await db.collection("auditlogs").createIndex({ userId: 1 });
    await db.collection("auditlogs").createIndex({ action: 1 });
    await db.collection("auditlogs").createIndex({ resourceType: 1 });
    await db.collection("auditlogs").createIndex({ createdAt: -1 });
    await db.collection("auditlogs").createIndex({ userId: 1, createdAt: -1 });
    console.log("✓ AuditLog indexes created");

    console.log("\n✅ All indexes created successfully!");
    console.log("\nIndex Summary:");
    console.log("- Product: 15 indexes (including text search)");
    console.log("- SalesOrder: 16 indexes (including text search)");
    console.log("- Invoice: 15 indexes (including text search)");
    console.log("- User: 10 indexes (including text search)");
    console.log("- Customer: 12 indexes (including text search)");
    console.log("- Payment: 5 indexes");
    console.log("- Route: 6 indexes");
    console.log("- AuditLog: 6 indexes");
  } catch (error) {
    console.error("Error creating indexes:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed.");
  }
}

// Run the script
if (require.main === module) {
  createIndexes();
}

module.exports = createIndexes;
