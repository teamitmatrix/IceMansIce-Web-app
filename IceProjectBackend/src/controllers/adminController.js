/**
 * Reset invoice sequence (admin only)
 */
async function resetInvoiceSequence(req, res, next) {
  try {
    const { sequence } = req.body;
    if (typeof sequence !== 'number' || sequence < 1) {
      return res.status(400).json({ error: 'Invalid sequence number' });
    }
    const dal = getDAL();
    const newSeq = await dal.resetInvoiceSequence(sequence);
    res.json({ message: 'Invoice sequence reset', sequence: newSeq });
  } catch (error) {
    next(error);
  }
}
const adminService = require("../services/adminService");
const logger = require("../utils/logger");
const { ValidationError } = require("../utils/errors");
const { getDAL } = require("../dal");
const Joi = require("joi");
const SalesOrder = require("../models/SalesOrder");

// Helper to join an address object into a single string (Option A storage)
// Format: "street, city, stateZip, country" (state and ZIP combined)
function joinAddress(addr) {
  if (!addr) return "";
  if (typeof addr === "string") return addr.trim();
  try {
    const { street, city, stateZip, state, zipCode, country } = addr || {};
    const statePart = stateZip || [state, zipCode].filter(Boolean).join(" ").trim();
    return [street, city, statePart, country]
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean)
      .join(", ");
  } catch {
    return "";
  }
}

/**
 * Get daily sales report
 */
async function getDailySalesReport(req, res, next) {
  try {
    const { date, warehouseId } = req.query;

    if (!date) {
      throw new ValidationError("Date parameter is required");
    }

    const report = await adminService.generateDailySalesReport(
      date,
      warehouseId
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get collections report
 */
async function getCollectionsReport(req, res, next) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError("Start date and end date are required");
    }

    const report = await adminService.generateCollectionsReport(
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get aging accounts report
 */
async function getAgingAccountsReport(req, res, next) {
  try {
    const report = await adminService.generateAgingAccountsReport();

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get route performance report
 */
async function getRoutePerformanceReport(req, res, next) {
  try {
    const { startDate, endDate, driverId } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError("Start date and end date are required");
    }

    const report = await adminService.generateRoutePerformanceReport(
      startDate,
      endDate,
      driverId
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get sales by item report
 */
async function getSalesByItemReport(req, res, next) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError("Start date and end date are required");
    }

    const report = await adminService.generateSalesByItemReport(
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get system health status
 */
async function getSystemHealth(req, res, next) {
  try {
    const health = await adminService.getSystemHealth();

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add new admin user
 */
async function addAdmin(req, res, next) {
  try {
    const addAdminSchema = Joi.object({
      name: Joi.string().min(2).max(100).required(),
      email: Joi.string().email().required(),
      phone: Joi.string()
        .pattern(/^\+?[0-9]+$/)
        .min(10)
        .required(),
      address: Joi.alternatives().try(
        Joi.string().min(3),
        Joi.object({
          street: Joi.string().required(),
          city: Joi.string().required(),
          stateZip: Joi.string().required(),
          country: Joi.string().optional(),
        })
      ).required(),
      password: Joi.string().min(8).required(),
    });

  const { error, value } = addAdminSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const dal = getDAL();
    const normalizedEmail = String(value.email).trim().toLowerCase();
    const existingUser = await dal.getUserByEmail(normalizedEmail);

    if (existingUser) {
      return res.status(409).json({
        error: "User already exists",
        message: "Email is already registered",
      });
    }

    const newAdminData = {
      ...value,
      email: normalizedEmail,
      role: "admin",
      address: joinAddress(value.address),
    };

  const admin = await dal.createUser(newAdminData);

    logger.info("Admin user created successfully", {
      adminId: admin.id,
      email: admin.email,
      createdBy: req.user.userId,
    });

    const adminJson = typeof admin.toJSON === 'function' ? admin.toJSON() : admin;
    res.status(201).json({
      message: "Admin user created successfully",
      user: {
        id: adminJson.id || admin.id,
        name: adminJson.name || admin.name,
        email: adminJson.email || admin.email,
        phone: adminJson.phone || admin.phone,
        address: adminJson.address || admin.address,
        addressString: adminJson.addressString || (typeof admin.address === 'string' ? admin.address : undefined),
        role: adminJson.role || admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create user (admin-managed): supports roles admin, customer, driver
 */
async function createUser(req, res, next) {
  try {
    // Convert address object to string BEFORE validation
    const payload = { ...req.body };
    if (payload.address !== undefined) {
      payload.address = joinAddress(payload.address);
    }

    const schema = Joi.object({
      name: Joi.string().min(2).max(100).required(),
      email: Joi.string().email().optional().allow('', null),
      phone: Joi.string().pattern(/^\+?[0-9]+$/).min(10).required(),
      address: Joi.string().optional().allow('', null),
      password: Joi.string().min(8).optional().allow('', null),
      role: Joi.string().valid("customer", "driver", "admin").required(),
      isActive: Joi.boolean().optional(),
    });

    const { error, value } = schema.validate(payload);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const dal = getDAL();
    
    // Only check for existing email if email is provided and not empty
    const normalizedEmail = value.email ? String(value.email).trim().toLowerCase() : '';
    // Skip email uniqueness check if email is empty or only whitespace
    if (normalizedEmail && normalizedEmail.length > 0) {
      const existing = await dal.getUserByEmail(normalizedEmail);
      if (existing) {
        return res.status(409).json({
          error: "User already exists",
          message: "Email is already registered",
        });
      }
    }

    // Set default password if not provided
    const password = value.password && value.password.trim() !== '' 
      ? value.password 
      : 'password123';

    // Prepare user data - only include email if not empty (sparse index requires undefined, not empty string)
    const userData = {
      ...value,
      password: password,
      role: String(value.role).toLowerCase(),
      address: value.address, // Already converted to string before validation
    };
    
    // Only include email if it's not empty
    if (normalizedEmail && normalizedEmail.length > 0) {
      userData.email = normalizedEmail;
    } else {
      delete userData.email; // Remove email from userData if empty
    }

    const user = await dal.createUser(userData);

    // Auto-create customer record when applicable (aligning with auth/register behavior)
    if (user.role === "customer") {
      try {
        await dal.createCustomer({
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address, // Already converted to string before validation
          paymentTerms: "net30",
          creditLimit: 1000,
          isActive: true,
        });
      } catch (e) {
        // Log and continue even if customer creation fails
        logger.warn("Customer record creation failed for new user", {
          userId: user.id,
          error: e.message,
        });
      }
    }

    const userJson = typeof user.toJSON === 'function' ? user.toJSON() : user;
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: userJson.id || user.id,
        name: userJson.name || user.name,
        email: userJson.email || user.email,
        phone: userJson.phone || user.phone,
        address: userJson.address || user.address,
        addressString: userJson.addressString || (typeof user.address === 'string' ? user.address : undefined),
        role: userJson.role || user.role,
        isActive: userJson.isActive ?? user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user (admin-managed)
 */
async function updateUser(req, res, next) {
  try {
    // Convert address object to string BEFORE validation
    const payload = { ...req.body };
    if (payload.address !== undefined) {
      payload.address = joinAddress(payload.address);
    }

    const schema = Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      phone: Joi.string().pattern(/^\+?[0-9]+$/).min(10).optional(),
      email: Joi.string().email(),
      address: Joi.string().optional().allow('', null),
      password: Joi.string().min(8).optional(),
      role: Joi.string().valid("customer", "driver", "admin").optional(),
      isActive: Joi.boolean().optional(),
    }).min(1);

    const { error, value } = schema.validate(payload);
    console.log(error);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const dal = getDAL();
    
    // Check email uniqueness if email is being updated
    if (value.email) {
      const normalizedEmail = String(value.email).trim().toLowerCase();
      if (normalizedEmail && normalizedEmail.length > 0) {
        const existingUser = await dal.getUserByEmail(normalizedEmail);
        // Allow if no user found, or if found user is the same one being updated
        if (existingUser && existingUser.id !== req.params.id) {
          return res.status(409).json({
            error: "Email already exists",
            message: "A user with this email address already exists",
          });
        }
        value.email = normalizedEmail;
      } else {
        // If email is empty, don't include it in update (preserve sparse index behavior)
        delete value.email;
      }
    }
    
    const updated = await dal.updateUser(req.params.id, value);
    const updatedJson = typeof updated.toJSON === 'function' ? updated.toJSON() : updated;
    res.json({
      message: "User updated successfully",
      user: updatedJson,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete user (admin-managed)
 */
async function deleteUser(req, res, next) {
  try {
    const dal = getDAL();
    const result = await dal.deleteUserCascade(req.params.id);
    res.json({ message: "User deleted successfully", cascade: result });
  } catch (error) {
    if (error && error.message === "Cannot delete customer with active orders or invoices") {
      return res.status(400).json({
        error: "Cannot delete user",
        message: error.message,
        code: "CUSTOMER_IN_USE",
      });
    }
    next(error);
  }
}

/**
 * Bulk delete users (admin-managed)
 * Body: { ids: string[] }
 * Returns per-id results: { deleted: string[], skipped: Array<{id, reason}>, failed: Array<{id, error}> }
 */
async function bulkDeleteUsers(req, res, next) {
  try {
    const schema = Joi.object({
      ids: Joi.array().items(Joi.string().required()).min(1).required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const dal = getDAL();
    const deleted = [];
    const skipped = [];
    const failed = [];

    for (const id of value.ids) {
      try {
        await dal.deleteUserCascade(id);
        deleted.push(id);
      } catch (err) {
        const msg = String(err?.message || 'Unknown error');
        if (msg.includes('Cannot delete customer with active orders or invoices')) {
          skipped.push({ id, reason: msg });
        } else {
          failed.push({ id, error: msg });
        }
      }
    }

    return res.json({ message: 'Bulk delete processed', deleted, skipped, failed });
  } catch (err) {
    next(err);
  }
}
/**
 * Get all users with pagination and filtering
 */
async function getUsers(req, res, next) {
  try {
    const { page = 1, limit = 20, role, search, isActive } = req.query;

    const dal = getDAL();
    const users = await dal.getUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      role,
      search,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all products with pagination and filtering
 */
async function getProducts(req, res, next) {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;

    const dal = getDAL();
    const products = await dal.getProducts({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
    });

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add new product
 */
async function addProduct(req, res, next) {
  try {
    const addProductSchema = Joi.object({
      name: Joi.string().min(2).max(200).required(),
      sku: Joi.string().trim().uppercase().optional(),
      description: Joi.string().max(1000).optional().allow(""),
      price: Joi.number().min(0).optional(),
      quantity: Joi.number().min(0).default(0),
      tax: Joi.number().min(0).max(1).default(0),
      unit: Joi.string().default("piece"),
      isActive: Joi.boolean().default(true),
      tags: Joi.array().items(Joi.string()).default([]),
    });

    const { error, value } = addProductSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const dal = getDAL();

    // Check SKU uniqueness
    const existingProduct = await dal.getProductBySku(value.sku);
    if (existingProduct) {
      return res.status(409).json({
        error: "Product already exists",
        message: "SKU is already in use",
        code: "SKU_EXISTS",
      });
    }

    // No derived pricing or min/max stock validation with simplified schema

    const product = await dal.createProduct(value);

    logger.info("Product created successfully", {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      createdBy: req.user.userId,
    });

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update product
 */
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;

    const updateProductSchema = Joi.object({
      name: Joi.string().min(2).max(200).optional(),
      sku: Joi.string().trim().uppercase().optional(),
      description: Joi.string().max(1000).optional().allow(""),
      price: Joi.number().min(0).optional(),
      quantity: Joi.number().min(0).optional(),
      tax: Joi.number().min(0).max(1).optional(),
      unit: Joi.string().optional(),
      isActive: Joi.boolean().optional(),
      tags: Joi.array().items(Joi.string()).optional(),
    });

    const { error, value } = updateProductSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const dal = getDAL();

    // Check if product exists
    const existingProduct = await dal.getProductById(id);
    if (!existingProduct) {
      return res.status(404).json({
        error: "Product not found",
        message: "Product with the given ID does not exist",
        code: "PRODUCT_NOT_FOUND",
      });
    }

    // Check SKU uniqueness if SKU is being updated
    if (value.sku && value.sku !== existingProduct.sku) {
      const productWithSku = await dal.getProductBySku(value.sku);
      if (productWithSku) {
        return res.status(409).json({
          error: "Product already exists",
          message: "SKU is already in use",
          code: "SKU_EXISTS",
        });
      }
    }

    // No derived pricing or min/max stock validation with simplified schema

    const updatedProduct = await dal.updateProduct(id, value);

    logger.info("Product updated successfully", {
      productId: id,
      sku: updatedProduct.sku,
      name: updatedProduct.name,
      updatedBy: req.user.userId,
    });

    res.json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete product
 */
async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;

    const dal = getDAL();

    // Check if product exists
    const existingProduct = await dal.getProductById(id);
    if (!existingProduct) {
      return res.status(404).json({
        error: "Product not found",
        message: "Product with the given ID does not exist",
        code: "PRODUCT_NOT_FOUND",
      });
    }

    // Check if product is used in any orders or invoices
    const ordersWithProduct = await dal.getOrders({ productId: id, limit: 1 });
    const invoicesWithProduct = await dal.getInvoices({
      productId: id,
      limit: 1,
    });

    if (ordersWithProduct.total > 0 || invoicesWithProduct.total > 0) {
      return res.status(400).json({
        error: "Cannot delete product",
        message:
          "Product is being used in orders or invoices. Consider deactivating instead.",
        code: "PRODUCT_IN_USE",
      });
    }

    await dal.deleteProduct(id);

    logger.info("Product deleted successfully", {
      productId: id,
      sku: existingProduct.sku,
      name: existingProduct.name,
      deletedBy: req.user.userId,
    });

    res.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all orders with pagination and filtering
 */
async function getOrders(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      customerId,
      driverId,
      dateFrom,
      dateTo,
      search,
      sortBy = "orderDate",
      sortOrder = "desc",
      productId,
      orderNumber,
    } = req.query;

    const dal = getDAL();
    const orders = await dal.getOrders({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      customerId,
      driverId,
      dateFrom,
      dateTo,
      search,
      sortBy,
      sortOrder,
      productId,
      orderNumber,
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all invoices with pagination and filtering
 */
async function getInvoices(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      customerId,
      dateFrom,
      dateTo,
      search,
      sortBy = "issueDate",
      sortOrder = "desc",
      productId,
      invoiceNumber,
      paymentStatus,
    } = req.query;

    const dal = getDAL();
    const invoices = await dal.getInvoices({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      customerId,
      dateFrom,
      dateTo,
      search,
      sortBy,
      sortOrder,
      productId,
      invoiceNumber,
      paymentStatus,
    });

    res.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all customers with pagination and filtering
 */
async function getCustomers(req, res, next) {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;

    const dal = getDAL();
    const customers = await dal.getCustomers({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
    });

    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all drivers with pagination and filtering
 */
async function getDrivers(req, res, next) {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;

    const dal = getDAL();
    const drivers = await dal.getDrivers({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
    });

    res.json({
      success: true,
      data: drivers,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Export data to CSV
 */
async function exportData(req, res, next) {
  try {
    const { type, format = "csv", ...filters } = req.query;

    if (!type) {
      throw new ValidationError("Export type is required");
    }

    const dal = getDAL();
    const data = await dal.exportData(type, filters);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${type}_export.csv"`
    );
    res.send(data);
  } catch (error) {
    next(error);
  }
}

/**
 * Get dashboard statistics
 */
async function getDashboardStats(req, res, next) {
  try {
    const stats = await adminService.getDashboardStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}


// Admin updates order: prices, status, driver, notes, etc.
async function updateOrder(req, res, next) {
  try {
    const { id } = req.params;

    // Validation Schema
    const schema = Joi.object({
      status: Joi.string()
        .valid("pending", "confirmed", "in_transit", "delivered", "cancelled")
        .optional(),
      items: Joi.array()
        .items(
          Joi.object({
            productId: Joi.string().required(),
            unitPrice: Joi.number().min(0).required(),
            taxRate: Joi.number().min(0).max(1).optional().default(0), // individual product tax rate (0-1 fraction)
          })
        )
        .optional(),
    }).min(1);

    const { error, value } = schema.validate(req.body);
    if (error)
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });

    const dal = getDAL();
    const order = await dal.getSalesOrderById(id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    //  Update item prices and taxes
    if (value.items && Array.isArray(value.items)) {
      order.items = order.items.map((item) => {
        const updated = value.items.find(
          (i) => i.productId.toString() === item.productId.toString()
        );
        if (updated) {
          item.unitPrice = updated.unitPrice;
          // Use taxRate field to match the model
          item.taxRate = updated.taxRate ?? item.taxRate ?? 0;

          const baseTotal = item.unitPrice * item.quantity - (item.discount || 0);
          const itemTaxAmount = baseTotal * (item.taxRate || 0);
          item.lineTotal = baseTotal + itemTaxAmount;
          item.taxAmount = itemTaxAmount; // store for reference
        }
        return item;
      });
    }

    // Recalculate totals
    order.subtotal = order.items.reduce(
      (sum, i) => sum + (i.unitPrice * i.quantity - (i.discount || 0)),
      0
    );
    order.taxAmount = order.items.reduce((sum, i) => sum + (i.taxAmount || 0), 0);
    order.total = order.subtotal + order.taxAmount;

    // Update status if provided
    if (value.status) {
      order.status = value.status;
    }

    order.updatedAt = new Date();

    const updatedOrder = await SalesOrder.findByIdAndUpdate(id, order, { new: true });

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (err) {
    console.error("Error updating order:", err);
    next(err);
  }
}

// generate invoice for an order
async function createInvoiceForOrder(req, res, next) {
  try {
    const { order } = req.body;
    if (!order) {
      return res.status(400).json({ error: "Order is required" });
    }
    const dal = getDAL();
    const createdInvoice = await dal.createAdminInvoice(order,req.user);
    res.status(201).json({
      message: "Invoice created successfully",
      invoice: createdInvoice,
    });
  } catch (error) {
    next(error);
  }
}


async function updateInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      throw new ValidationError("Invoice ID is required");
    }
 const dal = getDAL();
    const invoice = await dal.updateInvoice(id, updateData);

    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    res.status(200).json({
      message: "Invoice updated successfully",
      invoice,
    });
  } catch (error) {
    console.error("Error updating invoice:", error);
    next(error);
  }
}

/**
 * Mark an invoice as printed (admin action)
 */
async function markInvoicePrinted(req, res, next) {
  try {
    const { id } = req.params;
    const schema = Joi.object({
      printerName: Joi.string().optional(),
      deviceInfo: Joi.string().optional(),
    });
    const { error, value } = schema.validate(req.body || {});
    if (error) {
      return res.status(400).json({ error: 'Validation Error', message: error.details[0].message });
    }

    const dal = getDAL();
    // Ensure invoice exists
    const existing = await dal.getInvoiceById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const updateData = {
      // We reuse driverPrintInfo as a generic print record container
      driverPrintInfo: {
        printerName: value.printerName || 'Admin Device',
        printedAt: new Date(),
        deviceInfo: value.deviceInfo,
      },
      // Make explicit that this was not printed by a driver
      isPrintedByDriver: false,
    };

    const updated = await dal.updateInvoice(id, updateData);
    return res.json({ message: 'Invoice marked as printed', invoice: updated });
  } catch (err) {
    console.error('Admin markInvoicePrinted error:', err);
    next(err);
  }
}

module.exports = {
  getDailySalesReport,
  getCollectionsReport,
  getAgingAccountsReport,
  getRoutePerformanceReport,
  getSalesByItemReport,
  getSystemHealth,
  addAdmin,
  createUser,
  updateUser,
  deleteUser,
  getUsers,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  getInvoices,
  updateInvoice,
  getCustomers,
  getDrivers,
  bulkDeleteUsers,
  exportData,
  getDashboardStats,
  updateOrder,
  createInvoiceForOrder,
  markInvoicePrinted,
  resetInvoiceSequence,
};
