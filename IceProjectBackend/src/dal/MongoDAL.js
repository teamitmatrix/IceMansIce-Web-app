const IDAL = require("./IDAL");
const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const SalesOrder = require("../models/SalesOrder");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const InventoryMovement = require("../models/InventoryMovement");
const Route = require("../models/Route");
const Warehouse = require("../models/Warehouse");
const Truck = require("../models/Truck");
const User = require("../models/User");
const SyncQueue = require("../models/SyncQueue");
const AuditLog = require("../models/AuditLog");
const DriverSession = require("../models/DriverSession");
const { NotFoundError } = require("../utils/errors");

class MongoDAL extends IDAL {
  // Get current invoice sequence
  async getInvoiceSequence() {
    const Counter = require('../models/Counter');
    let counter = await Counter.findOne({ key: 'invoiceNumber' });
    if (!counter) {
      counter = await Counter.create({ key: 'invoiceNumber', seq: 1 });
    }
    return counter.seq;
  }

  // Reset invoice sequence
  async resetInvoiceSequence(newSeq) {
    const Counter = require('../models/Counter');
    let counter = await Counter.findOneAndUpdate(
      { key: 'invoiceNumber' },
      { seq: newSeq },
      { new: true, upsert: true }
    );
    return counter.seq;
  }
  async createCustomer(customerData) {
    const customer = new Customer(customerData);
    return await customer.save();
  }

  async getCustomerById(id) {
    console.log("id", id)
    const customer = await Customer.findById(id);
    console.log("customer", customer)
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }
    return customer;
  }
  async listCustomersBalance(id) {
    const customer = await Customer.findById(id);
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }
    return customer.balance;
  }
  async listCustomersPayments(id, options = {}) {
    const customer = await Customer.findById(id);
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }
    return customer.payments;
  }

  async getCustomerByEmail(email) {
    return await Customer.findOne({ email: email.toLowerCase() });
  }

  async getCustomerByUserId(userId) {
    return await Customer.findOne({ userId:userId });
  }

  async updateCustomer(id, updateData) {
    // Update the Customer document by its own ID. If the customer is linked to a User (via userId),
    // also propagate basic profile fields to the User for consistency.
    const allowedCustomerFields = [
      "name",
      "email",
      "phone",
      "address",
      "paymentTerms",
      "creditLimit",
      "notes",
      "isActive",
      "qboId", // QuickBooks ID
      // balance fields are rarely updated directly but supported by route schema
      "balance",
      "balanceDue",
      "balanceOverdue",
      "balancePaid",
      "balanceUnpaid",
    ];

    const customerUpdate = {};
    for (const key of allowedCustomerFields) {
      if (Object.prototype.hasOwnProperty.call(updateData, key)) {
        customerUpdate[key] = updateData[key];
      }
    }
    console.log('updating customer id:', id, 'with data:', customerUpdate);
    const customer = await Customer.findByIdAndUpdate(id, customerUpdate, {
      new: true,
      runValidators: true,
    });
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    // If there is a linked user, sync basic fields
    if (customer.userId) {
      const allowedUserFields = ["name", "email", "phone", "address", "isActive"];
      const userUpdate = {};
      for (const key of allowedUserFields) {
        if (Object.prototype.hasOwnProperty.call(customerUpdate, key)) {
          userUpdate[key] = customerUpdate[key];
        }
      }
      if (Object.keys(userUpdate).length > 0) {
        try {
          await User.findByIdAndUpdate(customer.userId, userUpdate, { new: true });
        } catch (_) {
          // Non-fatal: if user record missing, proceed with customer update
        }
      }
    }

    return customer;
  }

  async deleteCustomer(id) {
    const customer = await Customer.findByIdAndDelete(id);
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }
    return customer;
  }

  /**
   * Delete a customer and cascade to its linked user (if any).
   * - Guards against deleting if there are related orders or invoices
   * - Runs in a transaction for atomicity
   */
  async deleteCustomerCascade(id) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const customer = await Customer.findById(id).session(session);
      if (!customer) {
        throw new NotFoundError("Customer not found");
      }

      // Guard: prevent deletion if customer has orders or invoices
      const [ordersCount, invoicesCount] = await Promise.all([
        SalesOrder.countDocuments({ customerId: customer._id }).session(session),
        Invoice.countDocuments({ customerId: customer._id }).session(session),
      ]);

      if (ordersCount > 0 || invoicesCount > 0) {
        // Match expected message in route's error handler
        throw new Error("Cannot delete customer with active orders or invoices");
      }

      // If there is a linked user, delete it too
      if (customer.userId) {
        await User.findByIdAndDelete(customer.userId).session(session);
      }

      await Customer.findByIdAndDelete(customer._id).session(session);

      await session.commitTransaction();
      return { deletedCustomerId: String(customer._id), deletedUserId: customer.userId ? String(customer.userId) : null };
    } catch (err) {
      try { await session.abortTransaction(); } catch {}
      throw err;
    } finally {
      session.endSession();
    }
  }

  async listCustomers(filters = {}, pagination = {}) {
    const query = {};

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters.paymentTerms) {
      query.paymentTerms = filters.paymentTerms;
    }
    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      Customer.countDocuments(query),
    ]);

    return {
      data: customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async searchCustomers(term) {
    return await Customer.search(term);
  }

  async updateCustomerBalance(id, amount) {
    const customer = await this.getCustomerById(id);
    return await customer.updateBalance(amount);
  }
  async createProduct(productData) {
    const product = new Product(productData);
    return await product.save();
  }

  async getProductById(id) {
    const product = await Product.findById(id);
    if (!product) {
      throw new NotFoundError("Product not found");
    }
    return product;
  }

  async getProductBySku(sku) {
    return await Product.findOne({ sku: sku.toUpperCase() });
  }

  async updateProduct(id, updateData) {
    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      throw new NotFoundError("Product not found");
    }
    return product;
  }

  async deleteProduct(id) {
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      throw new NotFoundError("Product not found");
    }
    return product;
  }

  async listProducts(filters = {}, pagination = {}) {
    const query = {};

    // Apply filters with index optimization
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }
    if (filters.unit) {
      query.unit = filters.unit;
    }
    if (filters.minPrice !== undefined) {
      query.price = { $gte: filters.minPrice };
    }
    if (filters.maxPrice !== undefined) {
      query.price = { ...query.price, $lte: filters.maxPrice };
    }
    // lowStock/minStock not supported in simplified schema

    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const skip = (page - 1) * limit;

    // Use optimized sort based on filters and indexes
    let sort = { name: 1 };
    if (filters.sortBy) {
      sort = { [filters.sortBy]: filters.sortOrder === "desc" ? -1 : 1 };
    } else if (filters.isActive !== undefined) {
      // Use compound index for better performance
      sort = { isActive: 1, name: 1 };
    }

    const [products, total] = await Promise.all([
      Product.find(query).sort(sort).skip(skip).limit(limit),
      Product.countDocuments(query),
    ]);

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async searchProducts(term, filters = {}, pagination = {}) {
    const query = {};

    // Add text search if search term provided
    if (term && term.trim()) {
      query.$text = { $search: term.trim() };
    }

    // Apply additional filters
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const skip = (page - 1) * limit;

    // Use text score for sorting if searching, otherwise sort by name
    let sort = term ? { score: { $meta: "textScore" } } : { name: 1 };

    const [products, total] = await Promise.all([
      Product.find(query, { score: { $meta: "textScore" } })
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async adjustProductStock(id, { delta, reason, warehouseId, truckId, notes, adjustedBy }) {
    const product = await this.getProductById(id);
    const before = typeof product.quantity === 'number' ? product.quantity : 0;
    const after = Math.max(0, before + Number(delta || 0));
    product.quantity = after;
    await product.save();

    let locationType = 'global';
    let locationId;
    if (warehouseId) { locationType = 'warehouse'; locationId = warehouseId; }
    if (truckId) { locationType = 'truck'; locationId = truckId; }

    let movement = null;
    try {
      movement = await this.createInventoryMovement({
        productId: product._id,
        delta: Number(delta || 0),
        reason: reason || 'adjustment',
        locationType,
        locationId,
        referenceType: 'manual_adjustment',
        referenceId: product._id,
        referenceModel: 'Product',
        quantityBefore: before,
        quantityAfter: after,
        performedBy: adjustedBy,
        notes,
      });
    } catch {}

    return { newStock: after, movement };
  }

  async getProductStock(id, location = "global") {
    const product = await this.getProductById(id);
    // Simplified schema: single global quantity
    return typeof product.quantity === 'number' ? product.quantity : 0;
  }

  async findLowStockProducts() {
    return await Product.findLowStock();
  }

  async getSalesOrderById(id) {
    const order = await SalesOrder.findById(id)
      .populate("customerId", "name email phone address")
      .populate("assignedDriver", "name email");
    if (!order) {
      throw new NotFoundError("Sales order not found");
    }
    return order;
  }

  async getSalesOrderByNumber(orderNumber) {
    return await SalesOrder.findOne({ orderNumber })
      .populate("customerId", "name email phone")
      .populate("assignedDriver", "name email");
  }

  async updateSalesOrder(id, updateData) {
    const order = await SalesOrder.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("customerId", "name email phone");

    if (!order) {
      throw new NotFoundError("Sales order not found");
    }

    if (updateData.items) {
      order.calculateTotals();
      await order.save();
    }

    return order;
  }

  async deleteSalesOrder(id) {
    const order = await SalesOrder.findByIdAndDelete(id);
    if (!order) {
      throw new NotFoundError("Sales order not found");
    }
    return order;
  }

  async listSalesOrders(filters = {}, pagination = {}) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.customerId) {
      query.customerId = filters.customerId;
    }
    // Support driverId (match either assignedDriver OR createdByDriver) for driver portal usage
    if (filters.driverId) {
      query.$or = [
        { assignedDriver: filters.driverId },
        { createdByDriver: filters.driverId },
      ];
    } else if (filters.assignedDriver) {
      query.assignedDriver = filters.assignedDriver;
    }
    if (filters.startDate) {
      query.orderDate = { $gte: filters.startDate };
    }
    if (filters.endDate) {
      query.orderDate = { ...query.orderDate, $lte: filters.endDate };
    }

    // Apply free-text search: orderNumber or customer name/email/phone
    if (filters.search && String(filters.search).trim()) {
      const term = String(filters.search).trim();
      const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(esc, "i");

      const customers = await Customer.find({
        $or: [
          { name: { $regex: regex } },
          { email: { $regex: regex } },
          { phone: { $regex: regex } },
        ],
      })
        .select("_id")
        .lean();
      const customerIds = customers.map((c) => c._id);

      query.$or = [
        { orderNumber: { $regex: regex } },
        ...(customerIds.length ? [{ customerId: { $in: customerIds } }] : []),
      ];
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      SalesOrder.find(query)
        .populate("customerId", "name email phone")
        .populate("assignedDriver", "name email")
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(limit),
      SalesOrder.countDocuments(query),
    ]);

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async approveSalesOrder(id, userId) {
    const order = await this.getSalesOrderById(id);
    return await order.approve(userId);
  }

  async cancelSalesOrder(id, reason) {
    const order = await this.getSalesOrderById(id);
    order.status = "cancelled";
    order.notes = reason;
    return await order.save();
  }

  async assignDriverToOrder(id, driverId) {
    const order = await this.getSalesOrderById(id);
    return await order.assignDriver(driverId);
  }

  async markOrderShipped(id) {
    const order = await this.getSalesOrderById(id);
    return await order.markShipped();
  }

  async markOrderDelivered(id) {
    const order = await this.getSalesOrderById(id);
    return await order.markDelivered();
  }

  async findPendingApprovalOrders() {
    return await SalesOrder.findPendingApproval();
  }

  async findOrdersByCustomer(customerId) {
    return await SalesOrder.findByCustomer(customerId);
  }

  async findOrdersByDriver(driverId) {
    return await SalesOrder.findByDriver(driverId);
  }

  async createInvoice(invoiceData) {
    const logger = require("../utils/logger");
    
    logger.info("DAL: Starting invoice creation", {
      customerId: invoiceData.customerId,
      salesOrderId: invoiceData.salesOrderId,
      total: invoiceData.total,
      itemsCount: invoiceData.items?.length,
    });

    // Check if invoice already exists for this sales order
    if (invoiceData.salesOrderId) {
      const existingInvoice = await Invoice.findOne({ 
        salesOrderId: invoiceData.salesOrderId 
      }).lean();
      
      if (existingInvoice) {
        logger.warn("DAL: Invoice already exists for sales order", {
          existingInvoiceId: existingInvoice._id,
          existingInvoiceNumber: existingInvoice.invoiceNumber,
          salesOrderId: invoiceData.salesOrderId,
          createdAt: existingInvoice.createdAt,
        });
        throw new Error(`Invoice already exists for sales order ${invoiceData.salesOrderId}`);
      }
    }

    // 1. Generate invoice number if not provided
    const invoiceNumber =
      invoiceData.invoiceNumber || (await Invoice.generateInvoiceNumber());

    // Validate invoice number
    if (isNaN(invoiceNumber) || !isFinite(invoiceNumber) || invoiceNumber < 1) {
      logger.error("DAL: Invalid invoice number generated", { 
        invoiceNumber, 
        type: typeof invoiceNumber,
        providedNumber: invoiceData.invoiceNumber 
      });
      throw new Error(`Invalid invoice number generated: ${invoiceNumber}`);
    }

    logger.info("DAL: Invoice number ready", { 
      invoiceNumber, 
      type: typeof invoiceNumber,
      isNaN: isNaN(invoiceNumber),
      providedNumber: invoiceData.invoiceNumber 
    });

    // 2. Build enriched items with product details + lineTotal
    const items = await Promise.all(
      invoiceData.items.map(async (item) => {
        let itemData = {
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          taxRate: item.taxRate || 0.00, // Default tax rate
        };

        const lineTotal = item.unitPrice * item.quantity - (item.discount || 0);
        itemData.lineTotal = lineTotal;

        // If productId exists, fetch product details (from existing products)
        if (item.productId) {
          const product = await Product.findById(item.productId).lean();
          if (product) {
            itemData.productId = item.productId;
            itemData.name = product.name;
            itemData.productName = product.name; // Ensure productName is always set
            itemData.sku = product.sku;
            itemData.taxRate = product.tax || itemData.taxRate;
          } else {
            // Product not found, fall back to manual entry
            itemData.productName =
              item.productName || item.name || "Unknown Product";
            itemData.sku = item.sku || "";
          }
        } else {
          // Manual entry from driver orders - use provided product name
          itemData.productName =
            item.productName || item.name || "Manual Entry";
          itemData.name = itemData.productName; // Also set name for consistency
          itemData.sku = item.sku || "";
        }

        return itemData;
      })
    );

    logger.info("DAL: Items processed", { 
      itemsCount: items.length,
      totalLineTotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
      itemSample: items.slice(0, 2).map(item => ({
        productName: item.productName,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        hasProduct: !!item.productId
      }))
    });

    // 3. Create invoice with required fields (guarding numeric fields)
    const invoice = new Invoice({
      invoiceNumber,
      customerId: invoiceData.customerId,
      salesOrderId: invoiceData.salesOrderId || invoiceData.orderId,
      items,
      subtotal:
        typeof invoiceData.subtotal === "number"
          ? invoiceData.subtotal
          : items.reduce(
              (s, i) =>
                s +
                (i.lineTotal || i.unitPrice * i.quantity - (i.discount || 0)),
              0
            ),
      taxAmount:
        typeof invoiceData.taxAmount === "number" ? invoiceData.taxAmount : 0,
      discountAmount:
        typeof invoiceData.discountAmount === "number" ? invoiceData.discountAmount : 0,
      total:
        typeof invoiceData.total === "number" ? invoiceData.total : undefined,
      balance:
        typeof invoiceData.balance === "number"
          ? invoiceData.balance
          : undefined,
      status: invoiceData.status || "pending",
      paymentTerms: invoiceData.paymentTerms || "immediate",
      paymentMethod: invoiceData.paymentMethod,
      poNumber: invoiceData.poNumber, // Include PO Number
      amountPaid:
        typeof invoiceData.amountPaid === "number"
          ? invoiceData.amountPaid
          : 0,
      notes: invoiceData.notes,
      createdByDriver: invoiceData.createdByDriver,
      createdBy: invoiceData.createdBy,
    });

    logger.info("DAL: Invoice object created", {
      invoiceNumber,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      balance: invoice.balance,
    });

    console.log(invoice.taxAmount, invoice.total, invoice.balance);
    
    // Debug invoice number right after creation
    console.log("=== INVOICE NUMBER DEBUG ===");
    console.log("Invoice number after creation:", invoice.invoiceNumber);
    console.log("Invoice number type:", typeof invoice.invoiceNumber);
    console.log("Invoice number isNaN:", isNaN(invoice.invoiceNumber));
    
    // Fallback compute total / balance if missing
    if (typeof invoice.total !== "number") {
      invoice.calculateTotals();
      logger.info("DAL: Totals calculated", { 
        total: invoice.total,
        invoiceNumber: invoice.invoiceNumber,
        invoiceNumberType: typeof invoice.invoiceNumber
      });
    }
    if (typeof invoice.balance !== "number") {
      invoice.balance = invoice.total - (invoice.amountPaid || 0);
      logger.info("DAL: Balance calculated", { 
        balance: invoice.balance,
        invoiceNumber: invoice.invoiceNumber,
        invoiceNumberType: typeof invoice.invoiceNumber
      });
    }

    // 4. Calculate totals (no due date display required now)
    invoice.calculateTotals();
    
    // Debug after calculateTotals
    console.log("=== AFTER CALCULATE TOTALS ===");
    console.log("Invoice number after calculateTotals:", invoice.invoiceNumber);
    console.log("Invoice number type:", typeof invoice.invoiceNumber);
    console.log("Invoice number isNaN:", isNaN(invoice.invoiceNumber));

    logger.info("DAL: Final invoice ready for save", {
      invoiceNumber,
      customerId: invoice.customerId,
      salesOrderId: invoice.salesOrderId,
      total: invoice.total,
      invoiceObject: {
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        salesOrderId: invoice.salesOrderId,
        itemsCount: invoice.items?.length,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        balance: invoice.balance,
        status: invoice.status,
        paymentTerms: invoice.paymentTerms,
        createdBy: invoice.createdBy,
        createdByDriver: invoice.createdByDriver,
      }
    });

    // Validate items before saving
    logger.info("DAL: Validating items", {
      items: invoice.items?.map(item => ({
        productName: item.productName,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        lineTotal: item.lineTotal,
        taxRateValid: item.taxRate >= 0 && item.taxRate <= 1,
      }))
    });

    // Check for invalid tax rates that might cause validation errors
    const invalidTaxRates = invoice.items?.filter(item => item.taxRate > 1);
    if (invalidTaxRates && invalidTaxRates.length > 0) {
      logger.warn("DAL: Found invalid tax rates > 1, converting to decimal", {
        invalidItems: invalidTaxRates.map(item => ({
          taxRate: item.taxRate,
          newTaxRate: item.taxRate / 100
        }))
      });
      
      // Convert percentage tax rates to decimals
      invoice.items.forEach(item => {
        if (item.taxRate > 1) {
          item.taxRate = item.taxRate / 100;
        }
      });
    }

    // 5. Save with error handling
    try {
      // Additional debugging right before save
      logger.info("DAL: About to save invoice", {
        invoiceNumber: invoice.invoiceNumber,
        invoiceNumberType: typeof invoice.invoiceNumber,
        invoiceNumberIsNaN: isNaN(invoice.invoiceNumber),
        invoiceJSON: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          customerId: invoice.customerId,
          status: invoice.status,
          total: invoice.total
        })
      });
      
      const savedInvoice = await invoice.save();
      
      logger.info("DAL: Invoice saved successfully", {
        invoiceId: savedInvoice._id,
        invoiceNumber: savedInvoice.invoiceNumber,
        total: savedInvoice.total,
      });

      return savedInvoice;
    } catch (error) {
      // Force console output for debugging
      console.log("=== INVOICE SAVE ERROR ===");
      console.log("Error name:", error.name);
      console.log("Error message:", error.message);
      console.log("Error code:", error.code);
      console.log("Is ValidationError:", error.name === 'ValidationError');
      
      if (error.errors) {
        console.log("Validation errors:");
        Object.keys(error.errors).forEach(field => {
          console.log(`  ${field}:`, error.errors[field].message, "Value:", error.errors[field].value);
        });
      }
      
      logger.error("DAL: Invoice save failed", {
        error: error.message,
        code: error.code,
        name: error.name,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
        validationErrors: error.errors,
        invoiceNumber,
        customerId: invoiceData.customerId,
        salesOrderId: invoiceData.salesOrderId,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });

      // Check for validation errors
      if (error.name === 'ValidationError') {
        const validationDetails = Object.keys(error.errors).map(field => ({
          field,
          message: error.errors[field].message,
          value: error.errors[field].value,
          kind: error.errors[field].kind
        }));
        
        console.log("=== VALIDATION DETAILS ===");
        console.log("Validation details:", JSON.stringify(validationDetails, null, 2));
        
        logger.error("DAL: Validation error details", {
          validationDetails,
          invoiceData: {
            invoiceNumber,
            customerId: invoiceData.customerId,
            salesOrderId: invoiceData.salesOrderId,
            itemsCount: items.length,
            subtotal: invoice.subtotal,
            total: invoice.total,
          }
        });
        
        throw new Error(`Validation failed: ${validationDetails.map(v => `${v.field}: ${v.message}`).join(', ')}`);
      }

      // Check for duplicate key error
      if (error.code === 11000) {
        if (error.keyPattern && error.keyPattern.invoiceNumber) {
          logger.error("DAL: Duplicate invoice number detected", {
            invoiceNumber,
            keyValue: error.keyValue,
          });
          throw new Error(`Invoice number ${invoiceNumber} already exists`);
        }
        if (error.keyPattern && error.keyPattern.salesOrderId) {
          logger.error("DAL: Duplicate sales order invoice detected", {
            salesOrderId: invoiceData.salesOrderId,
            keyValue: error.keyValue,
          });
          throw new Error(`Invoice for sales order ${invoiceData.salesOrderId} already exists`);
        }
      }

      throw error;
    }
  }


  // Admin invoice creation
  async createAdminInvoice(orderData,user) {
    console.log("driver",user);
  const logger = require("../utils/logger");
  let createdByDriver;

  if(user.role == 'driver' || user.role == 'Driver'){
    createdByDriver = user.userId;
  }

  logger.info("DAL: Starting admin invoice creation", {
    orderId: orderData._id,
    customerId: orderData.customerId,
    itemsCount: orderData.items?.length,
    total: orderData.total,
  });

  // Check if invoice already exists for this order
  if (orderData._id) {
    const existingInvoice = await Invoice.findOne({ salesOrderId: orderData._id }).lean();
    if (existingInvoice) {
      logger.warn("DAL: Invoice already exists for this order", {
        invoiceId: existingInvoice._id,
        invoiceNumber: existingInvoice.invoiceNumber,
        orderId: orderData._id,
      });
      throw new Error(`Invoice already exists for order ${orderData._id}`);
    }
  }

  // Generate invoice number
  const invoiceNumber = await Invoice.generateInvoiceNumber();

  // Build items directly from order (assuming order items already have unitPrice, quantity, taxRate, discount)
  const items = orderData.items.map(item => ({
    productId: item.productId || undefined,
    name: item.name || item.productName || "Manual Entry",
    productName: item.productName || item.name || "Manual Entry",
    sku: item.sku || "",
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discount: item.discount || 0,
    taxRate: item.taxRate || 0,
    lineTotal: item.lineTotal || item.unitPrice * item.quantity - (item.discount || 0),
  }));

  // Create invoice
  const invoice = new Invoice({
    invoiceNumber,
    customerId: orderData.customerId,
    salesOrderId: orderData._id,
    items,
    subtotal: orderData.subtotal || items.reduce((s, i) => s + i.lineTotal, 0),
    taxAmount: orderData.taxAmount || items.reduce((s, i) => s + i.lineTotal * (i.taxRate || 0), 0),
    discountAmount: orderData.discountAmount || 0,
    total: orderData.total || undefined,
    balance: orderData.total || undefined,
    status: "pending",
    paymentTerms: orderData.paymentTerms || "immediate",
    createdByDriver: createdByDriver,
    paymentMethod: orderData.paymentMethod,
    amountPaid: orderData.amountPaid || 0,
    notes: orderData.notes,
    createdBy: orderData.updatedBy || orderData.createdBy, // whoever generated invoice
  });

  // Ensure totals are correct
  // invoice.calculateTotals();

  try {
    const savedInvoice = await invoice.save();
    logger.info("DAL: Admin invoice created successfully", {
      invoiceId: savedInvoice._id,
      invoiceNumber: savedInvoice.invoiceNumber,
      total: savedInvoice.total,
    });
    return savedInvoice;
  } catch (error) {
    console.log(error);
    logger.error("DAL: Failed to save admin invoice", {
      error: error.message,
      orderId: orderData._id,
    });
    throw error;
  }
}

  
  async getInvoiceById(id) {
    const invoice = await Invoice.findById(id)
      .populate("customerId", "name email phone address")
      .populate("salesOrderId", "orderNumber poNumber paymentTerms");
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }
    return invoice;
  }

  async getInvoiceByNumber(invoiceNumber) {
    return await Invoice.findOne({ invoiceNumber })
      .populate("customerId", "name email phone address")
      .populate("salesOrderId", "orderNumber poNumber paymentTerms");
  }

  async updateInvoice(id, updateData) {
    const invoice = await Invoice.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("customerId", "name email phone address");

    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    if (updateData.items) {
      invoice.calculateTotals();
      await invoice.save();
    }

    return invoice;
  }

  async deleteInvoice(id) {
    const invoice = await Invoice.findByIdAndDelete(id);
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }
    return invoice;
  }

  async listInvoices(filters = {}, pagination = {}) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.customerId) {
      query.customerId = filters.customerId;
    }
    
    // Handle date filtering with proper date parsing
    if (filters.startDate || filters.endDate) {
      query.issueDate = {};
      
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        // Set to start of day
        startDate.setHours(0, 0, 0, 0);
        query.issueDate.$gte = startDate;
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        // Set to end of day
        endDate.setHours(23, 59, 59, 999);
        query.issueDate.$lte = endDate;
      }
    }

    // Base pagination with proper defaults
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 20)); // Default to 20, max 100
    const skip = (page - 1) * limit;

    // If searching, we need to search both invoiceNumber and customer fields
    if (filters.search && String(filters.search).trim()) {
      const term = String(filters.search).trim();

      // First, find matching customer IDs by name/email/phone
      const customerRegex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const customers = await Customer.find(
        {
          $or: [
            { name: { $regex: customerRegex } },
            { email: { $regex: customerRegex } },
            { phone: { $regex: customerRegex } },
          ],
        }
      ).select("_id").lean();

      const customerIds = customers.map((c) => c._id);

      // Extend query with OR across invoiceNumber or customer matches
      query.$or = [
        { invoiceNumber: { $regex: customerRegex } },
        ...(customerIds.length ? [{ customerId: { $in: customerIds } }] : []),
      ];
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate("customerId", "name email phone address")
        .populate("salesOrderId", "orderNumber orderDate poNumber paymentTerms createdBy assignedDriver")
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments(query),
    ]);

    // Debug logging
    console.log("Invoice query:", JSON.stringify(query, null, 2));
    console.log("Pagination:", { page, limit, skip });
    console.log("Results:", { foundInvoices: invoices.length, totalCount: total });

    return {
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async markInvoicePaid(id, amount) {
    const invoice = await this.getInvoiceById(id);
    return await invoice.recordPayment(amount);
  }

  async findOverdueInvoices() {
    return await Invoice.findOverdue();
  }

  async findInvoicesByCustomer(customerId) {
    return await Invoice.findByCustomer(customerId);
  }

  async generateInvoiceNumber() {
    return await Invoice.generateInvoiceNumber();
  }

  async createPayment(paymentData) {
    const payment = new Payment(paymentData);
    return await payment.save();
  }

  async getPaymentById(id) {
    const payment = await Payment.findById(id)
      .populate("customerId", "name email phone")
      .populate("invoiceId", "invoiceNumber");
    if (!payment) {
      throw new NotFoundError("Payment not found");
    }
    return payment;
  }

  async updatePayment(id, updateData) {
    const payment = await Payment.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("customerId", "name email phone");

    if (!payment) {
      throw new NotFoundError("Payment not found");
    }
    return payment;
  }

  async deletePayment(id) {
    const payment = await Payment.findByIdAndDelete(id);
    if (!payment) {
      throw new NotFoundError("Payment not found");
    }
    return payment;
  }

  async listPayments(filters = {}, pagination = {}) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.method) {
      query.method = filters.method;
    }
    if (filters.customerId) {
      query.customerId = filters.customerId;
    }
    if (filters.invoiceId) {
      query.invoiceId = filters.invoiceId;
    }
    if (filters.startDate) {
      query.receivedAt = { $gte: filters.startDate };
    }
    if (filters.endDate) {
      query.receivedAt = { ...query.receivedAt, $lte: filters.endDate };
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate("customerId", "name email phone")
        .populate("invoiceId", "invoiceNumber")
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(query),
    ]);

    return {
      data: payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findPaymentsByCustomer(customerId) {
    return await Payment.findByCustomer(customerId);
  }

  async findPaymentsByInvoice(invoiceId) {
    return await Payment.findByInvoice(invoiceId);
  }

  async getPaymentSummary(startDate, endDate) {
    return await Payment.getPaymentSummary(startDate, endDate);
  }

  async createInventoryMovement(movementData) {
    const movement = new InventoryMovement(movementData);
    movement.calculateValue();
    return await movement.save();
  }

  async getInventoryMovementById(id) {
    const movement = await InventoryMovement.findById(id)
      .populate("productId", "name sku")
      .populate("locationId", "name code")
      .populate("performedBy", "name");
    if (!movement) {
      throw new NotFoundError("Inventory movement not found");
    }
    return movement;
  }

  async listInventoryMovements(filters = {}, pagination = {}) {
    const query = {};

    if (filters.reason) {
      query.reason = filters.reason;
    }
    if (filters.productId) {
      query.productId = filters.productId;
    }
    if (filters.locationType) {
      query.locationType = filters.locationType;
    }
    if (filters.locationId) {
      query.locationId = filters.locationId;
    }
    if (filters.performedBy) {
      query.performedBy = filters.performedBy;
    }
    if (filters.startDate) {
      query.createdAt = { $gte: filters.startDate };
    }
    if (filters.endDate) {
      query.createdAt = { ...query.createdAt, $lte: filters.endDate };
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const skip = (page - 1) * limit;

    const [movements, total] = await Promise.all([
      InventoryMovement.find(query)
        .populate("productId", "name sku")
        .populate("locationId", "name code")
        .populate("performedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      InventoryMovement.countDocuments(query),
    ]);

    return {
      data: movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findMovementsByProduct(productId, options = {}) {
    return await InventoryMovement.findByProduct(productId, options);
  }

  async findMovementsByLocation(locationType, locationId, options = {}) {
    return await InventoryMovement.findByLocation(
      locationType,
      locationId,
      options
    );
  }

  async getInventorySummary(startDate, endDate) {
    return await InventoryMovement.getInventorySummary(startDate, endDate);
  }

  async getMovementReasonsSummary(startDate, endDate) {
    return await InventoryMovement.getReasonsSummary(startDate, endDate);
  }

  async createRoute(routeData) {
    const route = new Route(routeData);
    return await route.save();
  }

  async getRouteById(id) {
    const route = await Route.findById(id)
      .populate("driverId", "name email")
      .populate("truckId", "name code")
      .populate("stops.customerId", "name email phone");
    if (!route) {
      throw new NotFoundError("Route not found");
    }
    return route;
  }

  async getRouteByNumber(routeNumber) {
    return await Route.findOne({ routeNumber })
      .populate("driverId", "name email")
      .populate("truckId", "name code")
      .populate("stops.customerId", "name email phone");
  }

  async updateRoute(id, updateData) {
    const route = await Route.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("driverId", "name email");

    if (!route) {
      throw new NotFoundError("Route not found");
    }
    return route;
  }

  async deleteRoute(id) {
    const route = await Route.findByIdAndDelete(id);
    if (!route) {
      throw new NotFoundError("Route not found");
    }
    return route;
  }

  async listRoutes(filters = {}, pagination = {}) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.driverId) {
      query.driverId = filters.driverId;
    }
    if (filters.truckId) {
      query.truckId = filters.truckId;
    }
    if (filters.startDate) {
      query.date = { $gte: filters.startDate };
    }
    if (filters.endDate) {
      query.date = { ...query.date, $lte: filters.endDate };
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const skip = (page - 1) * limit;

    const [routes, total] = await Promise.all([
      Route.find(query)
        .populate("driverId", "name email")
        .populate("truckId", "name code")
        .sort({ date: -1, routeNumber: 1 })
        .skip(skip)
        .limit(limit),
      Route.countDocuments(query),
    ]);

    return {
      data: routes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async listRoutesCount(filters = {}) {
    return await Route.countDocuments(filters);
  }

  async startRoute(id) {
    const route = await this.getRouteById(id);
    return await route.startRoute();
  }

  async completeRoute(id) {
    const route = await this.getRouteById(id);
    return await route.completeRoute();
  }

  async addStopToRoute(id, customerId, sequence) {
    const route = await this.getRouteById(id);
    return await route.addStop(customerId, sequence);
  }

  async updateStopStatus(id, customerId, status, notes) {
    const route = await this.getRouteById(id);
    return await route.updateStopStatus(customerId, status, notes);
  }

  async findRoutesByDriver(driverId, date) {
    return await Route.findByDriver(driverId, date);
  }

  async findActiveRoutes() {
    return await Route.findActive();
  }

  async generateRouteNumber(date) {
    return await Route.generateRouteNumber(date);
  }

  async createWarehouse(warehouseData) {
    const warehouse = new Warehouse(warehouseData);
    return await warehouse.save();
  }

  async getWarehouses() {
    const warehouse = await Warehouse.findById();
    if (!warehouse) {
      throw new NotFoundError("Warehouse not found");
    }
    return warehouse;
  }

  async getWarehouseById(id) {
    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      throw new NotFoundError("Warehouse not found");
    }
    return warehouse;
  }

  async getWarehouseByCode(code) {
    return await Warehouse.findOne({ code: code.toUpperCase() });
  }

  async updateWarehouse(id, updateData) {
    const warehouse = await Warehouse.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!warehouse) {
      throw new NotFoundError("Warehouse not found");
    }
    return warehouse;
  }

  async deleteWarehouse(id) {
    const warehouse = await Warehouse.findByIdAndDelete(id);
    if (!warehouse) {
      throw new NotFoundError("Warehouse not found");
    }
    return warehouse;
  }

  async listWarehouses(filters = {}, pagination = {}) {
    const query = {};

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const skip = (page - 1) * limit;

    const [warehouses, total] = await Promise.all([
      Warehouse.find(query)
        .populate("manager", "name email")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Warehouse.countDocuments(query),
    ]);

    return {
      data: warehouses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findActiveWarehouses() {
    return await Warehouse.findActive();
  }

  async createTruck(truckData) {
    const truck = new Truck(truckData);
    return await truck.save();
  }

  async getTruckById(id) {
    const truck = await Truck.findById(id).populate("driverId", "name email");
    if (!truck) {
      throw new NotFoundError("Truck not found");
    }
    return truck;
  }

  async getTruckByCode(code) {
    return await Truck.findOne({ code: code.toUpperCase() }).populate(
      "driverId",
      "name email"
    );
  }

  async updateTruck(id, updateData) {
    const truck = await Truck.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("driverId", "name email");

    if (!truck) {
      throw new NotFoundError("Truck not found");
    }
    return truck;
  }

  async deleteTruck(id) {
    const truck = await Truck.findByIdAndDelete(id);
    if (!truck) {
      throw new NotFoundError("Truck not found");
    }
    return truck;
  }

  async listTrucks(filters = {}, pagination = {}) {
    const query = {};

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters.isInService !== undefined) {
      query.isInService = filters.isInService;
    }
    if (filters.driverId) {
      query.driverId = filters.driverId;
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const skip = (page - 1) * limit;

    const [trucks, total] = await Promise.all([
      Truck.find(query)
        .populate("driverId", "name email")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Truck.countDocuments(query),
    ]);

    return {
      data: trucks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async assignDriverToTruck(id, driverId) {
    const truck = await this.getTruckById(id);
    return await truck.assignDriver(driverId);
  }

  async updateTruckLocation(id, latitude, longitude) {
    const truck = await this.getTruckById(id);
    return await truck.updateLocation(latitude, longitude);
  }

  async findAvailableTrucks() {
    return await Truck.findAvailable();
  }

  async findTrucksByDriver(driverId) {
    return await Truck.findByDriver(driverId);
  }

  async findTrucksNearLocation(longitude, latitude, maxDistance) {
    return await Truck.findNearLocation(longitude, latitude, maxDistance);
  }

  async createUser(userData) {
    const user = new User(userData);
    return await user.save();
  }

  async getUserById(id) {
    const user = await User.findById(id);
    console.log(user);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  }

  async getUserByEmail(email) {
    return await User.findOne({ email: email.toLowerCase() });
  }

  async updateUser(id, updateData) {
    
    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true
    });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  }

  async deleteUser(id) {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  }

  /**
   * Delete a user and cascade to related records where applicable.
   * - If user is a customer, also delete the linked Customer (guarding if orders/invoices exist)
   * - If user is a driver, clean up active sessions and unassign from trucks
   * - Runs in a transaction for atomicity
   */
  async deleteUserCascade(id) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const user = await User.findById(id).session(session);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // If this is a customer user, find corresponding Customer
      if ((user.role || "").toLowerCase() === "customer") {
        let customer = null;
        if (user.customerId) {
          customer = await Customer.findById(user.customerId).session(session);
        }
        if (!customer) {
          customer = await Customer.findOne({ userId: user._id }).session(session);
        }

        if (customer) {
          const [ordersCount, invoicesCount] = await Promise.all([
            SalesOrder.countDocuments({ customerId: customer._id }).session(session),
            Invoice.countDocuments({ customerId: customer._id }).session(session),
          ]);

          if (ordersCount > 0 || invoicesCount > 0) {
            // Prevent deletion to avoid orphaning financial records
            throw new Error("Cannot delete customer with active orders or invoices");
          }

          await Customer.findByIdAndDelete(customer._id).session(session);
        }
      }

      // If this is a driver user, perform cleanup (no separate driver collection)
      if ((user.role || "").toLowerCase() === "driver") {
        try {
          await DriverSession.updateMany(
            { driverId: user._id, isActive: true },
            { isActive: false, endedAt: new Date() }
          ).session(session);
        } catch (_) {}
        try {
          await Truck.updateMany(
            { driverId: user._id },
            { $unset: { driverId: "" } }
          ).session(session);
        } catch (_) {}
      }

      await User.findByIdAndDelete(user._id).session(session);

      await session.commitTransaction();
      return { deletedUserId: String(user._id) };
    } catch (err) {
      try { await session.abortTransaction(); } catch {}
      throw err;
    } finally {
      session.endSession();
    }
  }

  async listUsers(filters = {}, pagination = {}) {
    const query = {};

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters.role) {
      query.role = filters.role;
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password -refreshTokens")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findUsersByRole(role) {
    return await User.find({ role, isActive: true }).select(
      "-password -refreshTokens"
    );
  }

  async validateUserCredentials(email, password) {
    const user = await this.getUserByEmail(email);
    if (!user || !user.isActive) {
      return null;
    }

    const isValid = await user.comparePassword(password);
    return isValid ? user : null;
  }

  async generateRefreshToken(userId) {
    const user = await this.getUserById(userId);
    const token = user.generateRefreshToken();
    await user.save();
    return token;
  }

  async validateRefreshToken(userId, token) {
    const user = await this.getUserById(userId);
    const refreshToken = user.refreshTokens.find((rt) => rt.token === token);

    if (!refreshToken || refreshToken.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  async removeRefreshToken(userId, token) {
    const user = await this.getUserById(userId);
    user.removeRefreshToken(token);
    return await user.save();
  }

  async createSyncQueueItem(itemData) {
    const item = new SyncQueue(itemData);
    return await item.save();
  }

  async getSyncQueueItemById(id) {
    const item = await SyncQueue.findById(id);
    if (!item) {
      throw new NotFoundError("Sync queue item not found");
    }
    return item;
  }

  async updateSyncQueueItem(id, updateData) {
    const item = await SyncQueue.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!item) {
      throw new NotFoundError("Sync queue item not found");
    }
    return item;
  }

  async listSyncQueueItems(filters = {}, pagination = {}) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.entityType) {
      query.entityType = filters.entityType;
    }
    if (filters.clientId) {
      query.clientId = filters.clientId;
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      SyncQueue.find(query).sort({ createdAt: 1 }).skip(skip).limit(limit),
      SyncQueue.countDocuments(query),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findPendingSyncItems(clientId, limit) {
    return await SyncQueue.findPending(clientId, limit);
  }

  async findRetryableSyncItems(limit) {
    return await SyncQueue.findRetryable(limit);
  }

  async findSyncConflicts(clientId) {
    return await SyncQueue.findConflicts(clientId);
  }

  async getSyncStats(clientId, startDate, endDate) {
    return await SyncQueue.getSyncStats(clientId, startDate, endDate);
  }

  async createAuditLog(auditData) {
    return await AuditLog.logAction(auditData);
  }

  async getAuditLogById(id) {
    const log = await AuditLog.findById(id).populate(
      "actorId",
      "name email role"
    );
    if (!log) {
      throw new NotFoundError("Audit log not found");
    }
    return log;
  }

  async listAuditLogs(filters = {}, pagination = {}) {
    const query = {};

    if (filters.action) {
      query.action = filters.action;
    }
    if (filters.entityType) {
      query.entityType = filters.entityType;
    }
    if (filters.actorId) {
      query.actorId = filters.actorId;
    }
    if (filters.startDate) {
      query.createdAt = { $gte: filters.startDate };
    }
    if (filters.endDate) {
      query.createdAt = { ...query.createdAt, $lte: filters.endDate };
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate("actorId", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(query),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findAuditLogsByEntity(entityType, entityId, options = {}) {
    return await AuditLog.findByEntity(entityType, entityId, options);
  }

  async findAuditLogsByActor(actorId, options = {}) {
    return await AuditLog.findByActor(actorId, options);
  }

  async getAuditSummary(startDate, endDate) {
    return await AuditLog.getAuditSummary(startDate, endDate);
  }

  async getUserActivitySummary(startDate, endDate) {
    return await AuditLog.getUserActivitySummary(startDate, endDate);
  }

  async getDailySalesReport(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [invoices, payments] = await Promise.all([
      Invoice.find({
        issueDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ["cancelled"] },
      }).populate("customerId", "name"),
      Payment.find({
        receivedAt: { $gte: startOfDay, $lte: endOfDay },
        status: "completed",
      }).populate("customerId", "name"),
    ]);

    const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPayments = payments.reduce((sum, pay) => sum + pay.amount, 0);
    const totalInvoices = invoices.length;
    const totalPaymentsCount = payments.length;

    return {
      date,
      totalSales,
      totalPayments,
      totalInvoices,
      totalPaymentsCount,
      invoices,
      payments,
    };
  }

  async getCollectionsReport(startDate, endDate) {
    const payments = await Payment.find({
      receivedAt: { $gte: startDate, $lte: endDate },
      status: "completed",
    }).populate("customerId", "name");

    const summary = await Payment.getPaymentSummary(startDate, endDate);

    return {
      startDate,
      endDate,
      totalCollected: payments.reduce((sum, pay) => sum + pay.amount, 0),
      paymentCount: payments.length,
      summary,
    };
  }

  async getAgingAccountsReport() {
    const overdueInvoices = await Invoice.findOverdue();

    const aging = {
      current: 0,
      "1-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
    };

    const today = new Date();
    overdueInvoices.forEach((invoice) => {
      const daysOverdue = invoice.daysOverdue;
      if (daysOverdue <= 0) {
        aging.current += invoice.balance;
      } else if (daysOverdue <= 30) {
        aging["1-30"] += invoice.balance;
      } else if (daysOverdue <= 60) {
        aging["31-60"] += invoice.balance;
      } else if (daysOverdue <= 90) {
        aging["61-90"] += invoice.balance;
      } else {
        aging["90+"] += invoice.balance;
      }
    });

    return {
      aging,
      overdueInvoices,
      totalOverdue: overdueInvoices.reduce((sum, inv) => sum + inv.balance, 0),
    };
  }

  async getRoutePerformanceReport(startDate, endDate) {
    const routes = await Route.find({
      date: { $gte: startDate, $lte: endDate },
      status: "completed",
    }).populate("driverId", "name");

    const performance = routes.map((route) => ({
      routeNumber: route.routeNumber,
      driverName: route.driverId.name,
      date: route.date,
      totalStops: route.totalStops,
      completedStops: route.completedStops,
      completionPercentage: route.completionPercentage,
      efficiency: route.efficiency,
      actualDuration: route.actualDuration,
      estimatedDuration: route.estimatedDuration,
    }));

    return {
      startDate,
      endDate,
      totalRoutes: routes.length,
      performance,
    };
  }

  async getSalesByItemReport(startDate, endDate) {
    const invoices = await Invoice.find({
      issueDate: { $gte: startDate, $lte: endDate },
      status: { $nin: ["cancelled"] },
    }).populate("items.productId", "name sku");

    const itemSales = {};

    invoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        const productId = item.productId._id.toString();
        if (!itemSales[productId]) {
          itemSales[productId] = {
            productId: item.productId._id,
            productName: item.productId.name,
            sku: item.productId.sku,
            quantity: 0,
            revenue: 0,
          };
        }
        itemSales[productId].quantity += item.quantity;
        itemSales[productId].revenue += item.lineTotal;
      });
    });

    const salesArray = Object.values(itemSales).sort(
      (a, b) => b.revenue - a.revenue
    );

    return {
      startDate,
      endDate,
      totalRevenue: salesArray.reduce((sum, item) => sum + item.revenue, 0),
      totalItems: salesArray.reduce((sum, item) => sum + item.quantity, 0),
      items: salesArray,
    };
  }

  async getInventoryValuationReport() {
    const products = await Product.find({ isActive: true });

    const valuation = products.map((product) => ({
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      quantity: typeof product.quantity === 'number' ? product.quantity : 0,
      unitPrice: product.price || 0,
      totalValue: (product.price || 0) * (typeof product.quantity === 'number' ? product.quantity : 0),
    }));

    const totalValue = valuation.reduce((sum, item) => sum + item.totalValue, 0);
    const totalItems = valuation.reduce((sum, item) => sum + item.quantity, 0);

    return {
      totalValue,
      totalItems,
      products: valuation.sort((a, b) => b.totalValue - a.totalValue),
    };
  }

  async getCustomerActivityReport(startDate, endDate) {
    const [customers, invoices, payments] = await Promise.all([
      Customer.find({ isActive: true }),
      Invoice.find({
        issueDate: { $gte: startDate, $lte: endDate },
      }),
      Payment.find({
        receivedAt: { $gte: startDate, $lte: endDate },
      }),
    ]);

    const customerActivity = customers.map((customer) => {
      const customerInvoices = invoices.filter(
        (inv) => inv.customerId.toString() === customer._id.toString()
      );
      const customerPayments = payments.filter(
        (pay) => pay.customerId.toString() === customer._id.toString()
      );

      return {
        customerId: customer._id,
        customerName: customer.name,
        email: customer.email,
        totalOrders: customerInvoices.length,
        totalSpent: customerInvoices.reduce((sum, inv) => sum + inv.total, 0),
        totalPayments: customerPayments.reduce(
          (sum, pay) => sum + pay.amount,
          0
        ),
        currentBalance: customer.balance,
        lastActivity:
          customerInvoices.length > 0
            ? Math.max(...customerInvoices.map((inv) => inv.issueDate))
            : null,
      };
    });

    return {
      startDate,
      endDate,
      totalCustomers: customers.length,
      activeCustomers: customerActivity.filter((c) => c.totalOrders > 0).length,
      customerActivity: customerActivity.sort(
        (a, b) => b.totalSpent - a.totalSpent
      ),
    };
  }

  // Driver Session Management
  async createDriverSession(sessionData) {
    const session = new DriverSession(sessionData);
    return await session.save();
  }

  async getActiveDriverSession(driverId, deviceId = null) {
    const query = { driverId, isActive: true };
    if (deviceId) {
      query.deviceId = deviceId;
    }
    return await DriverSession.findOne(query);
  }

  async endDriverSession(sessionId) {
    const session = await DriverSession.findById(sessionId);
    if (!session) {
      throw new NotFoundError("Driver session not found");
    }
    return await session.endShift();
  }

  async updateDriverLocation(sessionId, latitude, longitude, accuracy) {
    const session = await DriverSession.findById(sessionId);
    if (!session) {
      throw new NotFoundError("Driver session not found");
    }
    return await session.updateLocation(latitude, longitude, accuracy);
  }

  async addOrderToDriverSession(sessionId, orderAmount) {
    const session = await DriverSession.findById(sessionId);
    if (!session) {
      throw new NotFoundError("Driver session not found");
    }
    return await session.addOrderProcessed(orderAmount);
  }

  async getDriverStats(driverId, startDate, endDate) {
    const stats = await DriverSession.getDriverStats(
      driverId,
      startDate,
      endDate
    );
    return (
      stats[0] || {
        totalSessions: 0,
        totalOrders: 0,
        totalAmount: 0,
        totalMinutes: 0,
      }
    );
  }

  // Driver-specific Customer operations
  async searchCustomers(searchTerm, limit = 20) {
    return await Customer.search(searchTerm).limit(limit);
  }

  async getCustomerByPhone(phone) {
    return await Customer.findOne({ phone: phone.trim() });
  }

  async getCustomerOrders(customerId, options = {}) {
    const query = { customerId };

    if (options.dateFrom || options.dateTo) {
      query.orderDate = {};
      if (options.dateFrom) query.orderDate.$gte = options.dateFrom;
      if (options.dateTo) query.orderDate.$lte = options.dateTo;
    }

    const orders = await SalesOrder.find(query)
      .sort(options.sort || { orderDate: -1 })
      .limit(options.limit || 50)
      .populate("customerId", "name email phone")
      .populate("createdByDriver", "name email");

    return orders;
  }

  async getCustomerPayments(customerId, options = {}) {
    const query = { customerId };

    if (options.dateFrom || options.dateTo) {
      query.receivedAt = {};
      if (options.dateFrom) query.receivedAt.$gte = options.dateFrom;
      if (options.dateTo) query.receivedAt.$lte = options.dateTo;
    }

    const payments = await Payment.find(query)
      .sort(options.sort || { receivedAt: -1 })
      .limit(options.limit || 50)
      .populate("collectedByDriver", "name email");

    return payments;
  }

  // Driver-specific Order operations
  async generateOrderNumber() {
    return await SalesOrder.generateOrderNumber();
  }

  async createSalesOrder(orderData) {
    // If no orderNumber provided, generate one
    if (!orderData.orderNumber) {
      orderData.orderNumber = await SalesOrder.generateOrderNumber();
    }

    // Process items - support both manual entries and existing products
    const populatedItems = await Promise.all(
      orderData.items.map(async (item) => {
        let itemData = {
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          taxRate: item.taxRate || 0,
        };

        const lineTotal = item.unitPrice * item.quantity - (item.discount || 0);
        itemData.lineTotal = lineTotal;

        // Prefer explicit productId; otherwise try resolving by SKU for better stock tracking
        if (item.productId) {
          const product = await Product.findById(item.productId);
          if (product) {
            itemData.productId = product._id;
            itemData.name = product.name;
            itemData.productName = product.name; // ensure required field present
            itemData.sku = product.sku;
            itemData.taxRate = product.taxRate || item.taxRate || 0;
          } else {
            itemData.productName = item.productName || "Unknown Product";
          }
        } else if (item.sku) {
          const product = await Product.findOne({ sku: String(item.sku).toUpperCase() });
          if (product) {
            itemData.productId = product._id;
            itemData.name = product.name;
            itemData.productName = product.name; // ensure required field present
            itemData.sku = product.sku;
            itemData.taxRate = product.taxRate || item.taxRate || 0;
          } else {
            itemData.productName = item.productName || "Unknown Product";
          }
        } else {
          // Manual entry - use provided product name and try to resolve by name (case-insensitive)
          itemData.productName = item.productName;
          if (item.productName && item.productName.trim()) {
            try {
              const name = String(item.productName).trim();
              const product = await Product.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: 'i' } });
              if (product) {
                itemData.productId = product._id;
                itemData.name = product.name;
                itemData.productName = product.name;
                itemData.sku = product.sku;
                itemData.taxRate = product.taxRate || item.taxRate || 0;
              }
            } catch {}
          }
        }

        return itemData;
      })
    );

    // Validate requested quantities against available stock before saving
    for (const it of populatedItems) {
      if (!it.productId) continue;
      const product = await Product.findById(it.productId).lean();
      if (!product) continue;
  const available = typeof product.quantity === 'number' ? product.quantity : 0;
      const requested = typeof it.quantity === 'number' ? it.quantity : 0;
      if (requested > available) {
        const { ValidationError } = require('../utils/errors');
        throw new ValidationError(`Insufficient stock for ${product.name}. Available: ${available}, requested: ${requested}`);
      }
    }

    const order = new SalesOrder({
      ...orderData,
      items: populatedItems,
    });

    order.calculateTotals();

    const saved = await order.save();

  // After order is saved, decrement stock (quantity) for any recognized products and record inventory movements.
    try {
      const performer = orderData.createdBy || orderData.createdByDriver; // user id
      for (const it of populatedItems) {
        if (!it.productId) continue; // manual entries have no stock impact

        const product = await Product.findById(it.productId);
        if (!product) continue;

        const currentQty = typeof product.quantity === 'number' ? product.quantity : 0;
        const requested = typeof it.quantity === 'number' ? it.quantity : 0;
        const actualOut = Math.min(currentQty, requested);
        const newQty = currentQty - actualOut;

        // Apply update
        product.quantity = newQty;
        await product.save();

        if (performer) {
          try {
            await this.createInventoryMovement({
              productId: product._id,
              delta: -actualOut,
              reason: 'sale',
              locationType: 'global',
              referenceType: 'sales_order',
              referenceId: saved._id,
              referenceModel: 'SalesOrder',
              quantityBefore: currentQty,
              quantityAfter: newQty,
              performedBy: performer,
              notes: `Order ${saved.orderNumber}`,
            });
          } catch (imErr) {
            // Non-fatal; log and continue
            try { require('../utils/logger').warn('Failed to record inventory movement', { error: imErr.message, productId: String(product._id), orderId: String(saved._id) }); } catch {}
          }
        }
      }
    } catch (stockErr) {
      try { require('../utils/logger').error('Stock adjustment failed after order creation', { error: stockErr.message, orderId: String(saved._id) }); } catch {}
    }

    return saved;
  }

  async getSalesOrderById(orderId, options = {}) {
    let query = SalesOrder.findById(orderId);

    if (options.populate) {
      options.populate.forEach((field) => {
        query = query.populate(field);
      });
    }

    const order = await query;
    if (!order) {
      throw new NotFoundError("Sales order not found");
    }
    return order;
  }

  // Driver-specific Invoice operations
  async generateInvoiceNumber() {
    return await Invoice.generateInvoiceNumber();
  }

  async getInvoiceByOrderId(orderId) {
    return await Invoice.findOne({ salesOrderId: orderId });
  }

  async getInvoiceById(invoiceId, options = {}) {
    let query = Invoice.findById(invoiceId);

    if (options.populate) {
      options.populate.forEach((field) => {
        query = query.populate(field);
      });
    } else {
      // Default population for driver invoices
      query = query
        .populate("customerId", "name email phone address")
        .populate("salesOrderId", "orderNumber orderDate poNumber paymentTerms");
    }

    const invoice = await query;
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }
    return invoice;
  }

  async updateInvoice(invoiceId, updateData) {
    // Fetch the current invoice first
    const currentInvoice = await Invoice.findById(invoiceId);
    if (!currentInvoice) {
      throw new NotFoundError("Invoice not found");
    }

    // Handle status-based logic for amount paid and balance
    if (updateData.status) {
      const status = updateData.status.toLowerCase();
      
      switch (status) {
        case "paid":
          // Fully paid: amountPaid = total, balance = 0
          updateData.amountPaid = currentInvoice.total;
          updateData.balance = 0;
          break;
          
        case "partial":
          // Partial payment: use provided amountPaid or keep current
          // If amountPaid is provided, calculate balance
          if (updateData.amountPaid !== undefined) {
            const amountPaid = Number(updateData.amountPaid) || 0;
            updateData.amountPaid = Math.max(0, Math.min(amountPaid, currentInvoice.total));
            updateData.balance = currentInvoice.total - updateData.amountPaid;
          } else {
            // Keep current amountPaid and recalculate balance
            updateData.balance = currentInvoice.total - currentInvoice.amountPaid;
          }
          break;
          
        case "overdue":
          // Overdue: preserve existing payment data
          // The remaining balance is overdue, not the total
          // If amountPaid is provided, update it
          if (updateData.amountPaid !== undefined) {
            const amountPaid = Number(updateData.amountPaid) || 0;
            updateData.amountPaid = Math.max(0, Math.min(amountPaid, currentInvoice.total));
            updateData.balance = currentInvoice.total - updateData.amountPaid;
          } else {
            // Keep current amountPaid and recalculate balance
            updateData.amountPaid = currentInvoice.amountPaid || 0;
            updateData.balance = currentInvoice.total - updateData.amountPaid;
          }
          break;
          
        case "draft":
        case "pending":
        case "approved":
        case "sent":
        case "cancelled":
          // These statuses: reset payment data (no payment received)
          // amountPaid = 0, balance = total
          updateData.amountPaid = 0;
          updateData.balance = currentInvoice.total;
          break;
      }
    } else if (updateData.amountPaid !== undefined) {
      // Status not changed but amountPaid is being updated
      const amountPaid = Number(updateData.amountPaid) || 0;
      updateData.amountPaid = Math.max(0, Math.min(amountPaid, currentInvoice.total));
      updateData.balance = currentInvoice.total - updateData.amountPaid;
      
      // Auto-set status based on payment amount
      if (updateData.amountPaid >= currentInvoice.total) {
        updateData.status = "paid";
        updateData.balance = 0;
      } else if (updateData.amountPaid > 0) {
        updateData.status = "partial";
      } else {
        // No payment made, keep current status unless it was paid/partial
        if (currentInvoice.status === "paid" || currentInvoice.status === "partial") {
          updateData.status = "pending";
        }
      }
    }
    
    const invoice = await Invoice.findByIdAndUpdate(invoiceId, updateData, {
      new: true,
      runValidators: true,
    });
    
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }
    
    return invoice;
  }

  async recordInvoicePayment(invoiceId, amount) {
    const invoice = await this.getInvoiceById(invoiceId);
    return await invoice.recordPayment(amount);
  }

  // Driver-specific Payment operations
  async createPayment(paymentData) {
    const payment = new Payment(paymentData);
    return await payment.save();
  }

  // Driver Dashboard queries
  async getDriverOrders(driverId, options = {}) {
    const query = { createdByDriver: driverId };

    if (options.dateFrom || options.dateTo) {
      query.orderDate = {};
      if (options.dateFrom) query.orderDate.$gte = options.dateFrom;
      if (options.dateTo) query.orderDate.$lte = options.dateTo;
    }

    const orders = await SalesOrder.find(query)
      .sort({ orderDate: -1 })
      .limit(options.limit || 50)
      .populate("customerId", "name email phone");

    return orders;
  }

  async getDriverPayments(driverId, options = {}) {
    const query = { collectedByDriver: driverId };

    if (options.dateFrom || options.dateTo) {
      query.receivedAt = {};
      if (options.dateFrom) query.receivedAt.$gte = options.dateFrom;
      if (options.dateTo) query.receivedAt.$lte = options.dateTo;
    }

    const payments = await Payment.find(query)
      .sort({ receivedAt: -1 })
      .limit(options.limit || 50)
      .populate("customerId", "name email phone")
      .populate("invoiceId", "invoiceNumber");

    return payments;
  }

  async getDriverPendingInvoices(driverId) {
    const orders = await SalesOrder.find({
      createdByDriver: driverId,
      status: { $in: ["pending", "approved", "processing"] },
    }).select("_id");

    const orderIds = orders.map((order) => order._id);

    const invoices = await Invoice.find({
      salesOrderId: { $in: orderIds },
      status: { $in: ["pending", "sent"] },
      balance: { $gt: 0 },
    })
      .populate("customerId", "name email phone")
      .sort({ issueDate: -1 });

    return invoices;
  }

  // Admin methods
  async getUsers(options = {}) {
    const query = {};

    if (options.role) {
      query.role = options.role;
    }
    if (options.isActive !== undefined) {
      query.isActive = options.isActive;
    }
    if (options.search) {
      query.$or = [
        { name: { $regex: options.search, $options: "i" } },
        { email: { $regex: options.search, $options: "i" } },
        { phone: { $regex: options.search, $options: "i" } },
      ];
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getProducts(options = {}) {
    const query = {};

    if (options.isActive !== undefined) {
      query.isActive = options.isActive;
    }
    if (options.search) {
      query.$or = [
        { name: { $regex: options.search, $options: "i" } },
        { sku: { $regex: options.search, $options: "i" } },
        { description: { $regex: options.search, $options: "i" } },
      ];
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      Product.countDocuments(query),
    ]);

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getProductBySku(sku) {
    return await Product.findOne({ sku: sku.toUpperCase() });
  }

  async createProduct(productData) {
    const product = new Product(productData);
    return await product.save();
  }

  async getOrders(options = {}) {
    const query = {};

    if (options.status) {
      query.status = options.status;
    }
    if (options.customerId) {
      query.customerId = options.customerId;
    }
    if (options.driverId) {
      query.assignedDriver = options.driverId;
    }
    if (options.dateFrom || options.dateTo) {
      query.orderDate = {};
      if (options.dateFrom) query.orderDate.$gte = new Date(options.dateFrom);
      if (options.dateTo) query.orderDate.$lte = new Date(options.dateTo);
    }
    if (options.search) {
      query.$or = [
        { orderNumber: { $regex: options.search, $options: "i" } },
        { "items.productName": { $regex: options.search, $options: "i" } },
      ];
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      SalesOrder.find(query)
        .populate("customerId", "name email phone")
        .populate("assignedDriver", "name email phone")
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(limit),
      SalesOrder.countDocuments(query),
    ]);

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getInvoices(options = {}) {
    const query = {};

    if (options.status) {
      query.status = options.status;
    }
    if (options.customerId) {
      query.customerId = options.customerId;
    }
    if (options.dateFrom || options.dateTo) {
      query.issueDate = {};
      if (options.dateFrom) query.issueDate.$gte = new Date(options.dateFrom);
      if (options.dateTo) query.issueDate.$lte = new Date(options.dateTo);
    }
    if (options.search) {
      const searchNumber = parseInt(options.search);
      const searchConditions = [
        { "items.productName": { $regex: options.search, $options: "i" } }
      ];
      
      // If the search query is a valid number, also search by invoice number
      if (!isNaN(searchNumber)) {
        searchConditions.push({ invoiceNumber: searchNumber });
      }
      
      query.$or = searchConditions;
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate("customerId", "name email phone address")
        .populate("salesOrderId", "orderNumber poNumber paymentTerms")
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments(query),
    ]);

    return {
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getCustomers(options = {}) {
    const query = {};

    if (options.isActive !== undefined) {
      query.isActive = options.isActive;
    }
    if (options.search) {
      query.$or = [
        { name: { $regex: options.search, $options: "i" } },
        { email: { $regex: options.search, $options: "i" } },
        { phone: { $regex: options.search, $options: "i" } },
      ];
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      Customer.countDocuments(query),
    ]);

    return {
      data: customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getDrivers(options = {}) {
    const query = { role: "driver" };

    if (options.isActive !== undefined) {
      query.isActive = options.isActive;
    }
    if (options.search) {
      query.$or = [
        { name: { $regex: options.search, $options: "i" } },
        { email: { $regex: options.search, $options: "i" } },
        { phone: { $regex: options.search, $options: "i" } },
      ];
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [drivers, total] = await Promise.all([
      User.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    return {
      data: drivers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async exportData(type, filters = {}) {
    let data = [];

    switch (type) {
      case "orders":
        const orders = await this.getOrders({ ...filters, limit: 10000 });
        data = orders.data.map((order) => ({
          orderNumber: order.orderNumber,
          customerName: order.customerId?.name || "N/A",
          customerEmail: order.customerId?.email || "N/A",
          driverName: order.assignedDriver?.name || "N/A",
          status: order.status,
          total: order.total,
          orderDate: order.orderDate,
          items: order.items
            .map((item) => `${item.productName} x${item.quantity}`)
            .join(", "),
        }));
        break;
      case "invoices":
        const invoices = await this.getInvoices({ ...filters, limit: 10000 });
        data = invoices.data.map((invoice) => ({
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerId?.name || "N/A",
          customerEmail: invoice.customerId?.email || "N/A",
          status: invoice.status,
          total: invoice.total,
          balance: invoice.balance,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
        }));
        break;
      case "customers":
        const customers = await this.getCustomers({ ...filters, limit: 10000 });
        data = customers.data.map((customer) => ({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address?.street || "N/A",
          balance: customer.balance || 0,
          paymentTerms: customer.paymentTerms,
          isActive: customer.isActive,
        }));
        break;
      case "products":
        const products = await this.getProducts({ ...filters, limit: 10000 });
        data = products.data.map((product) => ({
          name: product.name,
          sku: product.sku,
          price: product.price,
          quantity: product.quantity,
          isActive: product.isActive,
        }));
        break;
      default:
        throw new Error(`Unknown export type: ${type}`);
    }

    // Convert to CSV format
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => `"${row[header] || ""}"`).join(",")
      ),
    ];

    return csvRows.join("\n");
  }

  // Count methods for dashboard stats
  async countCustomers() {
    return await Customer.countDocuments();
  }

  async countProducts() {
    return await Product.countDocuments();
  }

  async countDrivers() {
    return await User.countDocuments({ role: "driver" });
  }

  async countSalesOrders() {
    return await SalesOrder.countDocuments();
  }

  // Last-30-days (or since arbitrary date) helpers for dashboard
  async countCustomersSince(sinceDate) {
    return await Customer.countDocuments({ createdAt: { $gte: sinceDate } });
  }

  async countProductsSince(sinceDate) {
    return await Product.countDocuments({ createdAt: { $gte: sinceDate } });
  }

  async countSalesOrdersSince(sinceDate) {
    return await SalesOrder.countDocuments({ orderDate: { $gte: sinceDate } });
  }

  async sumSalesSince(sinceDate) {
    const result = await SalesOrder.aggregate([
      { $match: { orderDate: { $gte: sinceDate } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    return result[0]?.total || 0;
  }

  async getOverdueInvoices() {
    return await Invoice.find({
      status: { $nin: ["paid", "cancelled"] },
      dueDate: { $lt: new Date() },
      balance: { $gt: 0 },
    }).populate("customerId", "name email phone");
  }
}

module.exports = MongoDAL;
