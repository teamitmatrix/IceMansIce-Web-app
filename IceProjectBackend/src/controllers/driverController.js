const Joi = require("joi");
const { getDAL } = require("../dal");
const logger = require("../utils/logger");

// Helpers for Option A address handling
// Helper: Normalize phone number for matching (removes non-numeric, handles country code)
function normalizePhone(phone) {
  if (!phone) return '';
  // Remove all non-numeric characters
  let digits = phone.replace(/\D/g, '');
  // Remove leading country code (assume US: 1, or +1)
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  // If country code is present as +1, remove it
  if (digits.length === 12 && digits.startsWith('01')) {
    digits = digits.slice(2);
  }
  return digits;
}
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
  } catch { return ""; }
}
function parseAddressString(str) {
  if (!str || typeof str !== 'string') return undefined;
  const parts = str.split(',').map(s => s.trim()).filter(Boolean);
  // Best-effort mapping: [street, city, state, zipCode, country]
  // Return new shape: stateZip combined
  return {
    street: parts[0] || '',
    city: parts[1] || '',
    stateZip: parts.length >= 5 ? [parts[2], parts[3]].filter(Boolean).join(' ') : (parts[2] || ''),
    country: parts.length >= 5 ? parts[4] || '' : (parts[3] || ''),
  };
}

// Helper to hide financial/terms fields from driver responses (module-scoped to avoid `this` binding issues)
function sanitizeCustomerForDriver(cust) {
  if (!cust) return cust;
  const obj = typeof cust.toJSON === 'function' ? cust.toJSON() : (typeof cust.toObject === 'function' ? cust.toObject() : { ...cust });
  // Ensure a stable id field for frontend
  if (!obj.id) {
    // _id can be an ObjectId; convert to string
    const raw = obj._id || cust._id || cust.id;
    if (raw) obj.id = raw.toString ? raw.toString() : String(raw);
  }
  delete obj.balance;
  delete obj.creditLimit;
  delete obj.paymentTerms;
  delete obj.isActive;
  return obj;
}


class DriverController {

  // update driver 
  
  // Driver Session Management
  async startSession(req, res, next) {
    try {
      const sessionSchema = Joi.object({
        deviceId: Joi.string().required(),
        deviceInfo: Joi.object({
          type: Joi.string().valid("mobile", "tablet", "desktop").default("mobile"),
          model: Joi.string().optional(),
          os: Joi.string().optional(),
          browser: Joi.string().optional(),
        }).optional(),
        location: Joi.object({
          latitude: Joi.number().min(-90).max(90).required(),
          longitude: Joi.number().min(-180).max(180).required(),
          accuracy: Joi.number().optional(),
        }).optional(),
      });

      const { error, value } = sessionSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const driverId = req.user.userId;



      // Check for existing active session
      const existingSession = await dal.getActiveDriverSession(driverId, value.deviceId);
      if (existingSession) {
        return res.json({
          message: "Session already active",
          session: existingSession,
        });
      }

      // Create new session
      const sessionData = {
        driverId,
        deviceId: value.deviceId,
        deviceInfo: value.deviceInfo,
        location: value.location ? {
          ...value.location,
          timestamp: new Date(),
        } : undefined,
      };

      const session = await dal.createDriverSession(sessionData);

      logger.info("Driver session started", {
        driverId,
        sessionId: session.id,
        deviceId: value.deviceId,
      });

      res.status(201).json({
        message: "Session started successfully",
        session,
      });
    } catch (error) {
      next(error);
    }
  }

  async endSession(req, res, next) {
    try {
      const dal = getDAL();
      const driverId = req.user.userId;
      const { deviceId } = req.body;

      const session = await dal.getActiveDriverSession(driverId, deviceId);
      if (!session) {
        return res.status(404).json({
          error: "Session not found",
          message: "No active session found for this device",
        });
      }

      await dal.endDriverSession(session.id);

      logger.info("Driver session ended", {
        driverId,
        sessionId: session.id,
      });

      res.json({
        message: "Session ended successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // update driver info
  async updateDriver(req,res,next){
    try {
      const dal = getDAL();
      const updateData = req.body;
      const id = req.params.id;
     
      const driver = await dal.updateUser(id,updateData);
     if(!driver){
      return res.json({
        message:"Driver not found"
      })
      
     }
     return res.json(driver);
    } catch (error) {
      console.log(error)
      next(error);
    }
  }

  async updateLocation(req, res, next) {
    try {
      const locationSchema = Joi.object({
        deviceId: Joi.string().required(),
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
        accuracy: Joi.number().optional(),
      });

      const { error, value } = locationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const driverId = req.user.userId;

      const session = await dal.getActiveDriverSession(driverId, value.deviceId);
      if (!session) {
        return res.status(404).json({
          error: "Session not found",
          message: "No active session found",
        });
      }

      await dal.updateDriverLocation(session.id, value.latitude, value.longitude, value.accuracy);

      res.json({
        message: "Location updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }


  // Customer Search
  async searchCustomers(req, res, next) {
    try {
      const searchSchema = Joi.object({
        term: Joi.string().min(2).required(),
        limit: Joi.number().min(1).max(50).default(20),
      });

      const { error, value } = searchSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const customers = await dal.searchCustomers(value.term, value.limit);

  // Sanitize for driver scope
  const safe = (customers || []).map((c) => sanitizeCustomerForDriver(c));

      res.json({
        customers: safe,
        count: customers.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCustomerDetails(req, res, next) {
    try {
      const customerId = req.params.customerId;
      if (!customerId) {
        return res.status(400).json({
          error: "Missing customer ID",
        });
      }

      const dal = getDAL();
      const customer = await dal.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          error: "Customer not found",
        });
      }

      // Get recent orders and payment history
      const [recentOrders, paymentHistory] = await Promise.all([
        dal.getCustomerOrders(customerId, { limit: 5, sort: { orderDate: -1 } }),
        dal.getCustomerPayments(customerId, { limit: 10, sort: { receivedAt: -1 } }),
      ]);

      res.json({
        customer: sanitizeCustomerForDriver(customer),
        recentOrders,
        paymentHistory,
      });
    } catch (error) {
      next(error);
    }
  }

  async createCustomer(req, res, next) {
    try {
      // Convert address object to string BEFORE validation
      const payload = { ...req.body };
      if (payload.address !== undefined) {
        payload.address = joinAddress(payload.address);
      }

      const customerSchema = Joi.object({
        name: Joi.string().min(2).max(200).required(),
        email: Joi.string().email().optional().allow('', null),
        password: Joi.string().min(8).optional().allow('', null),
        phone: Joi.string().min(10).required(),
        address: Joi.string().optional().allow('', null),
        paymentTerms: Joi.string()
          .valid("immediate", "net15", "net30", "net60")
          .default("immediate"),
        creditLimit: Joi.number().min(0).default(0),
        notes: Joi.string().max(1000).optional(),
      });

      const { error, value } = customerSchema.validate(payload);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const driverId = req.user.userId;

      // Normalize input for matching
      const normalizedEmail = value.email ? String(value.email).trim().toLowerCase() : '';
      const normalizedName = String(value.name).trim().toLowerCase();
      const normalizedPhone = normalizePhone(value.phone);

      // Check if a user already exists with this email (only if email is provided and not empty)
      // Skip email uniqueness check if email is empty or only whitespace
      if (normalizedEmail && normalizedEmail.length > 0) {
        const existingUser = await dal.getUserByEmail(normalizedEmail);
        if (existingUser) {
          return res.status(409).json({
            error: "User already exists",
            message: "A user with this email address already exists",
          });
        }
      }

      // Search for matching customer by name, email, or phone
      const allCustomers = await dal.listCustomers();
      let matchedCustomer = null;
      for (const cust of allCustomers.data) {
        // Name match: case-insensitive, full match
        const custName = (cust.name || '').trim().toLowerCase();
        // Email match: case-insensitive
        const custEmail = (cust.email || '').trim().toLowerCase();
        // Phone match: normalized
        const custPhone = normalizePhone(cust.phone || '');
        if (
          (normalizedName && custName && normalizedName === custName) ||
          (normalizedEmail && custEmail && normalizedEmail === custEmail) ||
          (normalizedPhone && custPhone && normalizedPhone === custPhone)
        ) {
          matchedCustomer = cust;
          break;
        }
      }

      // Create User first (role=customer)
      // Set default password if not provided
      const password = value.password && value.password.trim() !== '' 
        ? value.password 
        : 'password123';

      const newUserData = {
        name: value.name,
        phone: value.phone,
        address: value.address, // Already converted to string before validation
        password: password,
        role: 'customer',
        isActive: true,
      };
      
      // Only include email if it's not empty (sparse index requires undefined, not empty string)
      if (normalizedEmail && normalizedEmail.length > 0) {
        newUserData.email = normalizedEmail;
      }

      let userDoc = null;
      try {
        userDoc = await dal.createUser(newUserData);
      } catch (userErr) {
        logger.error('Failed to create user for driver-created customer', { error: userErr.message, email: normalizedEmail });
        return res.status(500).json({ error: 'Failed to create user', message: 'Could not create user account for the customer' });
      }

      let customer;
      if (matchedCustomer) {
        // Update existing customer with new userId and info
        const updateData = {
          userId: userDoc.id,
          name: value.name,
          phone: value.phone,
          address: value.address, // Already converted to string before validation
          paymentTerms: value.paymentTerms || matchedCustomer.paymentTerms || 'immediate',
          creditLimit: value.creditLimit || matchedCustomer.creditLimit || 0,
          notes: value.notes || matchedCustomer.notes,
          isActive: true,
          tags: Array.isArray(matchedCustomer.tags) ? [...matchedCustomer.tags, "driver-created"] : ["driver-created"],
        };
        // Only include email if not empty
        if (normalizedEmail && normalizedEmail.length > 0) {
          updateData.email = normalizedEmail;
        }
        customer = await dal.updateCustomer(matchedCustomer.id, updateData);
      } else {
        // Create new customer
        const customerData = {
          userId: userDoc.id,
          name: value.name,
          phone: value.phone,
          address: value.address, // Already converted to string before validation
          paymentTerms: value.paymentTerms || 'immediate',
          creditLimit: value.creditLimit || 0,
          notes: value.notes,
          isActive: true,
          tags: ["driver-created"],
        };
        // Only include email if not empty
        if (normalizedEmail && normalizedEmail.length > 0) {
          customerData.email = normalizedEmail;
        }
        customer = await dal.createCustomer(customerData);
      }

      logger.info("Customer created/linked by driver registration", {
        customerId: customer.id,
        customerName: customer.name,
        driverId,
        linkedUserId: userDoc.id,
        matchedExisting: !!matchedCustomer,
      });

      res.status(201).json({
        message: matchedCustomer ? "Customer linked to new user account" : "Customer created successfully",
        customer: sanitizeCustomerForDriver(customer),
        user: typeof userDoc.toJSON === 'function' ? userDoc.toJSON() : userDoc,
        linkedExisting: !!matchedCustomer,
      });
    } catch (error) {
      next(error);
    }
  }

  // Order Management
  async createOrder(req, res, next) {
    try {
      const orderSchema = Joi.object({
        customerId: Joi.string().required(),
        items: Joi.array()
          .items(
            Joi.object({
              productId: Joi.string().optional(),
              productName: Joi.string().required(),
              sku: Joi.string().optional(),
              quantity: Joi.number().min(1).required(),
              unitPrice: Joi.number().min(0).optional(),
              discount: Joi.number().min(0).default(0),
              taxRate: Joi.number().min(0).max(1).default(0),
            })
          )
          .min(1)
          .required(),
        deliveryAddress: Joi.alternatives().try(
          Joi.string().allow('', null),
          Joi.object({
            street: Joi.string().allow('', null).optional(),
            city: Joi.string().allow('', null).optional(),
            // allow combined stateZip for US-style addresses; keep optional to accept partials
            stateZip: Joi.string().allow('', null).optional(),
            country: Joi.string().allow('', null).optional(),
          }).optional()
        ).optional(),
        specialInstructions: Joi.string().max(1000).optional(),
        paymentMethod: Joi.string()
          .valid("cash", "online", "check", "charged")
          .required(),
        checkNumber: Joi.string().max(50).optional(),
        location: Joi.object({
          latitude: Joi.number().min(-90).max(90).required(),
          longitude: Joi.number().min(-180).max(180).required(),
        }).optional(),
        poNumber: Joi.string().trim().max(100).optional(),
        paymentTerms: Joi.string().valid("due on cash", "immediate", "net7", "net10", "net15", "net30", "net60").optional(),
      });

      const { error, value } = orderSchema.validate(req.body);
      console.log("received order:", value);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const driverId = req.user.userId;

      // Verify customer exists
      const customer = await dal.getCustomerById(value.customerId);
      if (!customer) {
        return res.status(404).json({
          error: "Customer not found",
        });
      }

      // Calculate line totals and order totals
      const processedItems = value.items.map((item) => {
        const lineTotal = item.unitPrice * item.quantity - item.discount;
        return {
          ...item,
          lineTotal,
        };
      });

      const subtotal = processedItems.reduce((sum, item) => sum + item.lineTotal, 0);
      const taxAmount = processedItems.reduce(
        (sum, item) => sum + item.lineTotal * item.taxRate,
        0
      );
      const total = subtotal + taxAmount;

      // Generate order number
      const orderNumber = await dal.generateOrderNumber();

      // Normalize deliveryAddress: if empty/missing, fallback to customer's saved address
      const provided = value.deliveryAddress;
      const providedHasContent = (() => {
        if (provided === undefined || provided === null) return false;
        if (typeof provided === 'string') return provided.trim().length > 0;
        if (typeof provided === 'object') {
          return Object.values(provided).some(v => (v ?? '').toString().trim().length > 0);
        }
        return false;
      })();

      let normalizedDelivery = undefined;
      if (providedHasContent) {
        normalizedDelivery = typeof provided === 'string' ? parseAddressString(provided) : provided;
      } else {
        // Use customer's address as fallback
        const customerAddrString = typeof customer.address === 'string' ? customer.address : joinAddress(customer.address);
        normalizedDelivery = parseAddressString(customerAddrString);
      }

      const orderData = {
        orderNumber,
        customerId: value.customerId,
        items: processedItems,
        subtotal,
        taxAmount,
        total,
        status: "pending",
        deliveryAddress: normalizedDelivery,
        specialInstructions: value.specialInstructions,
        paymentMethod: value.paymentMethod,
        // Derive flags automatically
        isPaidOnDelivery: value.paymentMethod === 'cash',
        isPaidOnline: value.paymentMethod === 'online',
        poNumber: value.poNumber,
        paymentTerms: value.paymentTerms,
        createdByDriver: driverId,
        driverLocation: value.location,
      };

      const order = await dal.createSalesOrder(orderData);

      logger.info("Order created by driver", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        driverId,
        customerId: value.customerId,
        total,
        poNumber: order.poNumber,
        paymentTerms: order.paymentTerms,
        orderData: {
          poNumber: orderData.poNumber,
          paymentTerms: orderData.paymentTerms
        }
      });

      res.status(201).json({
        message: "Order created successfully",
        order: {
          ...((typeof order.toJSON === 'function') ? order.toJSON() : order),
          deliveryAddressString: value.deliveryAddress && typeof value.deliveryAddress === 'string' ? value.deliveryAddress : joinAddress(normalizedDelivery),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getOrderDetails(req, res, next) {
    try {
      const orderId = req.params.orderId;
      if (!orderId) {
        return res.status(400).json({
          error: "Missing order ID",
        });
      }

      const dal = getDAL();
      const order = await dal.getSalesOrderById(orderId, {
        populate: ["customerId", "createdByDriver"],
      });

      if (!order) {
        return res.status(404).json({
          error: "Order not found",
        });
      }

      res.json({
        order,
      });
    } catch (error) {
      next(error);
    }
  }

  // Invoice Management
  async generateInvoice(req, res, next) {
    let order = null; // Declare order variable at function level to avoid ReferenceError
    
    logger.info("Invoice generation started", {
      orderId: req.body?.orderId,
      driverId: req.user?.userId,
      userRole: req.user?.role,
      requestBody: req.body,
    });

    try {
      const invoiceSchema = Joi.object({
        orderId: Joi.string().required(),
        paymentTerms: Joi.string()
          .valid("immediate", "net15", "net30", "net60")
          .default("immediate"),
        paymentMethod: Joi.string().valid('cash','online','check','charged').optional(),
        checkNumber: Joi.string().max(50).optional(),
        poNumber: Joi.string().trim().max(100).optional(),
        autoPay: Joi.boolean().optional().default(true),
        notes: Joi.string().max(1000).optional(),
      });

      const { error, value } = invoiceSchema.validate(req.body);
      if (error) {
        logger.error("Invoice validation failed", {
          error: error.details[0].message,
          orderId: req.body?.orderId,
          driverId: req.user?.userId,
        });
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const driverId = req.user.userId;

      logger.info("Getting order details", {
        orderId: value.orderId,
        driverId,
      });

      // Get order details
      logger.info("Getting order details", {
        orderId: value.orderId,
        driverId,
      });
      
      order = await dal.getSalesOrderById(value.orderId);
      if (!order) {
        logger.error("Order not found", {
          orderId: value.orderId,
          driverId,
        });
        return res.status(404).json({
          error: "Order not found",
        });
      }

      // Debug: Check order PO number
      console.log("=== ORDER DEBUG ===");
      console.log("Order PO Number:", order.poNumber);
      console.log("Order Payment Terms:", order.paymentTerms);
      console.log("Value PO Number:", value.poNumber);
      console.log("Value Payment Terms:", value.paymentTerms);

      logger.info("Order found, checking for existing invoice", {
        orderId: value.orderId,
        orderCustomerId: order.customerId,
        orderTotal: order.total,
        orderPoNumber: order.poNumber,
        orderPaymentTerms: order.paymentTerms,
        driverId,
      });

      // Check if invoice already exists (idempotent behavior)
      logger.info("Checking for existing invoice", {
        orderId: value.orderId,
        driverId,
      });
      
      const existingInvoice = await dal.getInvoiceByOrderId(value.orderId);
      
      if (existingInvoice) {
        logger.warn("DUPLICATE INVOICE DETECTED - Invoice already exists for order", {
          invoiceId: existingInvoice.id,
          invoiceNumber: existingInvoice.invoiceNumber,
          orderId: value.orderId,
          driverId,
          existingStatus: existingInvoice.status,
          existingPaymentMethod: existingInvoice.paymentMethod,
          existingTotal: existingInvoice.total,
          existingBalance: existingInvoice.balance,
          requestedPaymentMethod: value.paymentMethod,
          timestamp: new Date().toISOString(),
        });
        
        let updated = existingInvoice;
        if (value.paymentMethod && existingInvoice.paymentMethod !== value.paymentMethod) {
          logger.info("Updating payment method on existing invoice", {
            invoiceId: existingInvoice.id,
            oldPaymentMethod: existingInvoice.paymentMethod,
            newPaymentMethod: value.paymentMethod,
          });
          
          existingInvoice.paymentMethod = value.paymentMethod;
          if (value.autoPay !== false) {
            existingInvoice.status = 'paid';
            existingInvoice.amountPaid = existingInvoice.total;
            existingInvoice.balance = 0;
          }
          await existingInvoice.save();
          updated = existingInvoice;
        }
        
        logger.info("Returning existing invoice with 409 status", {
          invoiceId: updated.id,
          invoiceNumber: updated.invoiceNumber,
          status: updated.status,
          total: updated.total,
          balance: updated.balance,
        });
        
        return res.status(409).json({
          error: "Invoice already exists",
          message: "An invoice has already been generated for this order",
          invoice: updated,
          alreadyExisted: true,
          updatedPaymentMethod: !!value.paymentMethod && existingInvoice.paymentMethod !== value.paymentMethod,
        });
      }

      logger.info("No existing invoice found, proceeding to create new invoice", {
        orderId: value.orderId,
        driverId,
      });

      // Generate invoice number
      logger.info("Generating invoice number", {
        orderId: value.orderId,
        driverId,
      });
      
      const invoiceNumber = await dal.generateInvoiceNumber();
      
      logger.info("Invoice number generated, preparing invoice data", {
        invoiceNumber,
        orderId: value.orderId,
        customerId: order.customerId,
        itemsCount: order.items?.length || 0,
        total: order.total,
        driverId,
      });

      // Debug: Check values before creating invoice data
      console.log("=== INVOICE DATA CREATION DEBUG ===");
      console.log("order.poNumber:", order.poNumber);
      console.log("order.paymentTerms:", order.paymentTerms);
      console.log("value.poNumber:", value.poNumber);
      console.log("value.paymentTerms:", value.paymentTerms);
      console.log("Final poNumber will be:", value.poNumber || order.poNumber);
      console.log("Final paymentTerms will be:", value.paymentTerms || order.paymentTerms);

      const invoiceData = {
        invoiceNumber,
        customerId: order.customerId,
        salesOrderId: order.id,
        // Normalize items so they are compatible with relaxed invoice schema
        items: order.items.map(it => ({
          productId: it.productId || undefined,
          name: it.name || undefined,
          productName: it.productName || it.name || 'Manual Item',
          sku: it.sku || '',
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount || 0,
            taxRate: typeof it.taxRate === 'number' ? it.taxRate : 0,
            lineTotal: it.lineTotal || (it.unitPrice * it.quantity - (it.discount || 0))
        })),
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        total: order.total,
        balance: order.total,
        paymentTerms: value.paymentTerms || order.paymentTerms,
        poNumber: value.poNumber || order.poNumber,
        // Only set paymentMethod if explicitly provided or present on order (no silent default to cash)
        paymentMethod: value.paymentMethod ? value.paymentMethod : (order.paymentMethod || undefined),
        notes: value.notes,
        createdByDriver: driverId,
      };

      // Removed auto-pay logic - drivers must manually mark invoices as paid
      // This ensures proper tracking and allows drivers to control when payment is recorded

      logger.info("Creating invoice in database", {
        invoiceData: {
          invoiceNumber: invoiceData.invoiceNumber,
          customerId: invoiceData.customerId,
          salesOrderId: invoiceData.salesOrderId,
          total: invoiceData.total,
          status: invoiceData.status,
          paymentMethod: invoiceData.paymentMethod,
          poNumber: invoiceData.poNumber,
          paymentTerms: invoiceData.paymentTerms,
          orderPoNumber: order.poNumber,
          orderPaymentTerms: order.paymentTerms,
          valuePoNumber: value.poNumber,
          valuePaymentTerms: value.paymentTerms
        },
      });

      const invoice = await dal.createInvoice(invoiceData);

      logger.info("SUCCESS - Invoice generated by driver", {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        orderId: value.orderId,
        driverId,
        total: invoice.total,
        status: invoice.status,
        paymentMethod: invoice.paymentMethod,
        balance: invoice.balance,
        poNumber: invoice.poNumber,
        paymentTerms: invoice.paymentTerms,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({
        message: "Invoice generated successfully",
        invoice,
        alreadyExisted: false,
        autoPaid: value.autoPay !== false,
      });
    } catch (error) {
      // Handle duplicate key (race condition) gracefully (Mongo unique index on salesOrderId)
      if ((error.code === 11000 || error.code === 11001) && error.keyPattern && error.keyPattern.salesOrderId) {
        try {
          const dal = getDAL();
          const existing = await dal.getInvoiceByOrderId(req.body.orderId);
          if (existing) {
            logger.warn("Duplicate key race when creating invoice - returning existing", {
              invoiceId: existing.id,
              orderId: req.body.orderId,
              driverId: req.user?.userId,
            });
            return res.status(409).json({
              error: "Invoice already exists",
              message: "An invoice has already been generated for this order",
              invoice: existing,
              alreadyExisted: true,
              raceResolved: true,
            });
          }
        } catch (innerErr) {
          logger.error("Failed to fetch existing invoice after duplicate key", {
            error: innerErr.message,
            orderId: req.body?.orderId,
          });
        }
      }

      // Handle authentication errors
      if (error.name === 'UnauthorizedError' || error.status === 401) {
        logger.error('Authentication failed during invoice generation', {
          error: error.message,
          driverId: req.user?.userId,
          orderId: req.body?.orderId,
        });
        return res.status(401).json({
          error: "Authentication failed",
          message: "Driver authentication is invalid or expired",
        });
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        logger.error('Validation error during invoice generation', {
          error: error.message,
          validationErrors: error.errors,
          orderId: req.body?.orderId,
        });
        return res.status(400).json({
          error: "Validation Error",
          message: error.message,
          details: error.errors,
        });
      }

      // Add granular logging for debugging other validation errors
      logger.error('INVOICE GENERATION FAILED - Detailed Error Information', {
        error: error.message,
        errorName: error.name,
        errorCode: error.code,
        mongoErrorCode: error.code,
        stack: error.stack,
        requestBody: req.body,
        orderId: req.body?.orderId,
        driverId: req.user?.userId,
        userRole: req.user?.role,
        orderExists: !!order,
        orderData: order ? {
          id: order.id,
          customerId: order.customerId,
          total: order.total,
          status: order.status,
          itemsCount: order.items?.length,
        } : null,
        timestamp: new Date().toISOString(),
        errorDetails: {
          isValidationError: error.name === 'ValidationError',
          isMongoError: error.name === 'MongoError' || error.name === 'MongoServerError',
          isDuplicateKeyError: error.code === 11000 || error.code === 11001,
          hasKeyPattern: !!error.keyPattern,
          keyPattern: error.keyPattern,
        },
      });
      
      // Return different status codes based on error type
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: "Validation Error",
          message: error.message,
          details: error.errors,
        });
      }
      
      if ((error.code === 11000 || error.code === 11001)) {
        return res.status(409).json({
          error: "Duplicate Error",
          message: "Invoice creation failed due to duplicate constraint",
          details: error.keyPattern,
        });
      }
      
      // Generic server error
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Invoice generation failed",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  async getInvoiceDetails(req, res, next) {
    try {
      const invoiceId = req.params.invoiceId;
      if (!invoiceId) {
        return res.status(400).json({
          error: "Missing invoice ID",
        });
      }

      const dal = getDAL();
      const invoice = await dal.getInvoiceById(invoiceId, {
        populate: ["customerId", "salesOrderId"],
      });

      if (!invoice) {
        return res.status(404).json({
          error: "Invoice not found",
        });
      }

      res.json(invoice);
    } catch (error) {
      next(error);
    }
  }

  async markInvoicePrinted(req, res, next) {
    try {
      const invoiceId = req.params.invoiceId;
      const printSchema = Joi.object({
        printerName: Joi.string().optional(),
        deviceInfo: Joi.string().optional(),
      });

      const { error, value } = printSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const invoice = await dal.getInvoiceById(invoiceId);
      if (!invoice) {
        return res.status(404).json({
          error: "Invoice not found",
        });
      }

      const updateData = {
        isPrinted: true,
        isPrintedByDriver: true,
        driverPrintInfo: {
          printerName: value.printerName || "Default",
          printedAt: new Date(),
          deviceInfo: value.deviceInfo,
          driverId: req.user.userId,
        },
      };

      await dal.updateInvoice(invoiceId, updateData);

      logger.info("Invoice marked as printed by driver", {
        invoiceId,
        driverId: req.user.userId,
        printerName: value.printerName,
      });

      res.json({
        message: "Invoice marked as printed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async markInvoiceAsPaid(req, res, next) {
    try {
      const invoiceId = req.params.invoiceId;
      const dal = getDAL();
      
      // Get the current invoice
      const invoice = await dal.getInvoiceById(invoiceId);
      if (!invoice) {
        return res.status(404).json({
          error: "Invoice not found",
          message: "Invoice with the specified ID does not exist",
        });
      }

      // Check if invoice is already paid
      if (invoice.status === "paid" || invoice.balance <= 0) {
        return res.status(400).json({
          error: "Invoice already paid",
          message: "This invoice has already been marked as paid",
        });
      }

      // Update invoice to mark as paid
      const updateData = {
        status: "paid",
        amountPaid: invoice.total,
        balance: 0,
      };

      const updatedInvoice = await dal.updateInvoice(invoiceId, updateData);

      logger.info("Invoice marked as paid by driver", {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        driverId: req.user.userId,
      });

      res.json({
        message: "Invoice marked as paid successfully",
        invoice: updatedInvoice,
      });
    } catch (error) {
      logger.error("Failed to mark invoice as paid", {
        error: error.message,
        invoiceId: req.params.invoiceId,
        driverId: req.user?.userId,
      });
      next(error);
    }
  }

  async updateInvoice(req, res, next) {
    try {
      const invoiceId = req.params.invoiceId;
      const updateSchema = Joi.object({
        status: Joi.string()
          .valid("draft", "pending", "approved", "sent", "partial", "paid", "overdue", "cancelled")
          .optional(),
        amountPaid: Joi.number().min(0).optional(),
        notes: Joi.string().max(1000).optional(),
      });

      const { error, value } = updateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const invoice = await dal.getInvoiceById(invoiceId);
      if (!invoice) {
        return res.status(404).json({
          error: "Invoice not found",
        });
      }

      const updatedInvoice = await dal.updateInvoice(invoiceId, value);

      logger.info("Invoice updated by driver", {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        updates: value,
        driverId: req.user.userId,
      });

      res.json({
        message: "Invoice updated successfully",
        invoice: updatedInvoice,
      });
    } catch (error) {
      logger.error("Failed to update invoice", {
        error: error.message,
        invoiceId: req.params.invoiceId,
        driverId: req.user?.userId,
      });
      next(error);
    }
  }

  // Payment Processing
  async processPayment(req, res, next) {
    try {
      const paymentSchema = Joi.object({
        invoiceId: Joi.string().required(),
        amount: Joi.number().min(0.01).required(),
        method: Joi.string()
          .valid("cash", "online")
          .required(),
        reference: Joi.string().optional(),
        checkNumber: Joi.string().when("method", {
          is: "check",
          then: Joi.required(),
        }),
        location: Joi.object({
          latitude: Joi.number().min(-90).max(90).required(),
          longitude: Joi.number().min(-180).max(180).required(),
        }).optional(),
        notes: Joi.string().max(500).optional(),
      });

      const { error, value } = paymentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const driverId = req.user.userId;

      // Get invoice details
      const invoice = await dal.getInvoiceById(value.invoiceId);
      if (!invoice) {
        return res.status(404).json({
          error: "Invoice not found",
        });
      }

      if (invoice.balance <= 0) {
        return res.status(400).json({
          error: "Invoice already paid",
          message: "This invoice has already been fully paid",
        });
      }

      if (value.amount > invoice.balance) {
        return res.status(400).json({
          error: "Payment amount exceeds balance",
          message: `Payment amount cannot exceed remaining balance of $${invoice.balance}`,
        });
      }

      const paymentData = {
        customerId: invoice.customerId,
        invoiceId: value.invoiceId,
        salesOrderId: invoice.salesOrderId,
        amount: value.amount,
        method: value.method,
        reference: value.reference,
        checkNumber: value.checkNumber,
        status: "completed",
        receivedAt: new Date(),
        processedAt: new Date(),
        notes: value.notes,
        collectedByDriver: driverId,
        driverLocation: value.location ? {
          ...value.location,
          timestamp: new Date(),
        } : undefined,
        isDriverCollected: true,
      };

      const payment = await dal.createPayment(paymentData);

      // Update invoice
      await dal.recordInvoicePayment(value.invoiceId, value.amount);

      logger.info("Payment processed by driver", {
        paymentId: payment.id,
        invoiceId: value.invoiceId,
        driverId,
        amount: value.amount,
        method: value.method,
      });

      res.status(201).json({
        message: "Payment processed successfully",
        payment,
      });
    } catch (error) {
      next(error);
    }
  }

  // Driver Dashboard
  async getDashboard(req, res, next) {
    try {
      const dal = getDAL();
      const driverId = req.user.userId;

      // Day boundaries
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);

      // Fetch today's orders (driver created) and today's invoices (driver created)
      const todayOrders = await dal.getDriverOrders(driverId, { dateFrom: startOfDay, dateTo: endOfDay });

      // Reuse orders to infer counts and totals; invoices may be fetched directly if needed
      // We derive paymentsToday & totalCollectedToday from invoices marked paid today
      const Invoice = require('../models/Invoice');
      const paidInvoicesToday = await Invoice.find({
        createdByDriver: driverId,
        status: 'paid',
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }).select('total');

      const paymentsToday = paidInvoicesToday.length; // number of paid invoices today
      const totalCollectedToday = paidInvoicesToday.reduce((s, inv) => s + (inv.total || 0), 0);

      const stats = {
        ordersToday: todayOrders.length,
        paymentsToday,
        totalCollectedToday,
      };

      res.json({
        stats,
        recentOrders: todayOrders.slice(0,5),
      });
    } catch (error) {
      next(error);
    }
  }

  // Get Products for Order Creation
  async getProducts(req, res, next) {
    try {
      const dal = getDAL();
      
      // Get products with basic filtering
      const result = await dal.listProducts(
        {
          isActive: true // Only active products
        },
        {
          page: 1,
          limit: 100, // Get more products for driver use
          sortBy: "name",
          sortOrder: "asc"
        }
      );

      // Transform products for driver interface
      const products = result.data.map(product => {
        const base = typeof product.toJSON === 'function' ? product.toJSON() : product;
        const quantity = typeof base.quantity === 'number' ? base.quantity : (typeof base.stock === 'number' ? base.stock : (typeof base.totalStock === 'number' ? base.totalStock : 0));
        const tax = typeof base.tax === 'number' ? base.tax : (typeof base.taxRate === 'number' ? base.taxRate * 100 : 0);
        return {
          id: base._id || base.id,
          name: base.name,
          price: base.price || 0,
          category: base.category || "General",
          stock: quantity,
          tax,
          description: base.description || "",
          sku: base.sku || "",
        };
      });

      res.json(products);
    } catch (error) {
      next(error);
    }
  }

  // New: List Orders for driver
  async listOrders(req, res, next) {
    try {
      const { page = 1, limit = 20, status, dateFrom, dateTo } = req.query;
      const dal = getDAL();
      const driverId = req.user.userId;

      // Build filters leveraging new driverId support in DAL (matches assignedDriver OR createdByDriver)
      const filters = { driverId };
      if (status) filters.status = status;
      if (dateFrom) filters.startDate = dateFrom;
      if (dateTo) filters.endDate = dateTo;

      const result = await dal.listSalesOrders(filters, { page: parseInt(page), limit: parseInt(limit) });

      // Ensure createdByDriver populated if needed for client (lightweight manual populate if missing)
      // (We only populated customerId & assignedDriver in DAL; front-end only needs ids & customer name)
      const orders = (result.data || []).map(o => ({
        id: o._id || o.id,
        orderNumber: o.orderNumber,
        customerId: o.customerId, // already populated with name/email per DAL
        total: o.total,
        orderDate: o.orderDate,
        paymentMethod: o.paymentMethod,
        isPaidOnDelivery: o.isPaidOnDelivery,
  isPaidOnline: o.isPaidOnline,
        assignedDriver: o.assignedDriver,
        createdByDriver: o.createdByDriver,
        items: o.items,
        status: o.status,
        deliveryAddress: o.deliveryAddress,
        specialInstructions: o.specialInstructions,
        taxAmount: o.taxAmount,
        subtotal: o.subtotal,
        poNumber: o.poNumber,
      }));

      res.json({ orders, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  // New: List Invoices for driver
  async listInvoices(req, res, next) {
    try {
      const { page = 1, limit = 20, status, dateFrom, dateTo } = req.query;
      const dal = getDAL();
      const driverId = req.user.userId;

      const filters = {};
      if (status) filters.status = status;
      if (dateFrom) filters.startDate = dateFrom; // MongoDAL uses startDate/endDate for issueDate on invoices
      if (dateTo) filters.endDate = dateTo;

      const result = await dal.listInvoices(filters, { page: parseInt(page), limit: parseInt(limit) });

      // Filter to invoices linked to orders created/assigned to driver OR createdByDriver field
      const data = (result.data || []).filter(inv => {
        try {
          if (inv.createdByDriver && inv.createdByDriver.toString() === driverId.toString()) return true;
          if (inv.salesOrderId && inv.salesOrderId.createdBy && inv.salesOrderId.createdBy.toString() === driverId.toString()) return true;
          if (inv.salesOrderId && inv.salesOrderId.assignedDriver && inv.salesOrderId.assignedDriver.toString() === driverId.toString()) return true;
        } catch {}
        return false;
      });

      res.json({
        invoices: data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DriverController();