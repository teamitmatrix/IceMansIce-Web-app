const Joi = require('joi');
const { getDAL } = require('../dal');
const logger = require('../utils/logger');

function joinAddress(addr) {
  if (!addr) return "";
  if (typeof addr === 'string') return addr.trim();
  try {
    const { street, city, stateZip, state, zipCode, country } = addr || {};
    const statePart = stateZip || [state, zipCode].filter(Boolean).join(' ').trim();
    return [street, city, statePart, country]
      .map(x => (typeof x === 'string' ? x.trim() : ''))
      .filter(Boolean)
      .join(', ');
  } catch { return ''; }
}
function parseAddressString(str) {
  if (!str || typeof str !== 'string') return undefined;
  const parts = str.split(',').map(s => s.trim()).filter(Boolean);
  return {
    street: parts[0] || '',
    city: parts[1] || '',
    stateZip: parts.length >= 5 ? [parts[2], parts[3]].filter(Boolean).join(' ') : (parts[2] || ''),
    country: parts.length >= 5 ? parts[4] || '' : (parts[3] || ''),
  };
}

/**
 * Customer Portal Controller
 * Mirrors driver order/invoice flow but implicitly uses authenticated customer's identity.
 * - Orders auto-generate invoice data similar to driver flow
 * - Payment methods restricted to cash | online
 * - Flags derived: isPaidOnDelivery (cash), isPaidOnline (online)
 */
class CustomerPortalController {
  // Safely get an id string from either a populated document, ObjectId, or plain string
  _toId(v) {
    if (!v) return undefined;
    // If populated document
    if (typeof v === 'object') {
      const id = v._id || v.id;
      return id ? id.toString() : undefined;
    }
    try { return v.toString(); } catch { return undefined; }
  }
  async getDashboard(req, res, next) {
    try {
      const dal = getDAL();
      let customerId = req.user.customerId;
      if (!customerId && req.user.userId) {
        const existing = await dal.getCustomerByUserId(req.user.userId);
        if (existing) {
          customerId = existing.id || existing._id;
        } else {
          // Auto-provision a minimal customer linked to this user to allow order creation
          try {
            const user = await dal.getUserById(req.user.userId).catch(() => null);
            const created = await dal.createCustomer({
              userId: req.user.userId,
              name: user?.name || user?.email || 'Customer',
              email: user?.email,
              isActive: true,
              address: '',
            });
            customerId = created.id || created._id;
          } catch (provisionErr) {
            return res.status(400).json({ error: 'Missing customer association', message: 'Could not find or create a customer profile for this user.' });
          }
        }
      }
      if (!customerId) return res.status(400).json({ error: 'Missing customer association' });

      // Day boundaries
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);

      // Fetch today's orders and invoices for this customer
      const ordersResult = await dal.listSalesOrders({ customerId, startDate: startOfDay, endDate: endOfDay }, { page: 1, limit: 100 });
      const invoicesResult = await dal.listInvoices({ customerId, startDate: startOfDay, endDate: endOfDay }, { page: 1, limit: 100 });

      const ordersToday = ordersResult.data?.length || 0;
      const invoicesToday = invoicesResult.data?.length || 0;
      const amountInvoicedToday = (invoicesResult.data || []).reduce((s, inv) => s + (inv.total || 0), 0);

      // Recent orders and invoices (last 5)
      const recentOrdersAll = await dal.listSalesOrders({ customerId }, { page: 1, limit: 5 });
      const recentInvoicesAll = await dal.listInvoices({ customerId }, { page: 1, limit: 5 });

      const stats = {
        ordersToday,
        invoicesToday,
        amountInvoicedToday,
      };

      res.json({
        stats,
        recentOrders: (recentOrdersAll.data || []).slice(0,5),
        recentInvoices: (recentInvoicesAll.data || []).slice(0,5),
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async listOrders(req, res, next) {
    try {
      const { page = 1, limit = 20, status, dateFrom, dateTo } = req.query;
      const dal = getDAL();
      let customerId = req.user.customerId;
      if (!customerId && req.user.userId) {
        const customer = await dal.getCustomerByUserId(req.user.userId);
        customerId = customer?.id || customer?._id;
      }
      if (!customerId) return res.status(400).json({ error: 'Missing customer association' });

      const filters = { customerId };
      if (status) filters.status = status; // though status is deprecated in UI, keep for future
      if (dateFrom) filters.startDate = dateFrom;
      if (dateTo) filters.endDate = dateTo;

      const result = await dal.listSalesOrders(filters, { page: parseInt(page), limit: parseInt(limit) });
      const orders = (result.data || []).map(o => ({
        id: o._id || o.id,
        orderNumber: o.orderNumber,
        customerId: o.customerId,
        total: o.total,
        orderDate: o.orderDate,
        paymentMethod: o.paymentMethod,
        isPaidOnDelivery: o.isPaidOnDelivery,
        isPaidOnline: o.isPaidOnline,
        status: o.status,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      }));

      res.json({ orders, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getOrder(req, res, next) {
    try {
      const orderId = req.params.orderId;
      const dal = getDAL();
      let customerId = req.user.customerId;
      if (!customerId && req.user.userId) {
        const customer = await dal.getCustomerByUserId(req.user.userId);
        customerId = customer?.id || customer?._id;
      }
      const order = await dal.getSalesOrderById(orderId, { populate: ['customerId'] });
      const ownerId = this._toId(order?.customerId);
      if (!order || (customerId && ownerId !== this._toId(customerId))) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json({ order });
    } catch (error) { next(error); }
  }

  async createOrder(req, res, next) {
    try {
      const orderSchema = Joi.object({
        items: Joi.array().items(
          Joi.object({
            productId: Joi.string().optional(),
            productName: Joi.string().required(),
            sku: Joi.string().optional(),
            quantity: Joi.number().min(1).required(),
            unitPrice: Joi.number().min(0).optional(),
            discount: Joi.number().min(0).default(0),
            taxRate: Joi.number().min(0).max(1).default(0),
            
          })
        ).min(1).required(),
        deliveryAddress: Joi.alternatives().try(
          Joi.string().allow('', null),
          Joi.object({
            street: Joi.string().allow('', null).optional(),
            city: Joi.string().allow('', null).optional(),
            stateZip: Joi.string().allow('', null).optional(),
            country: Joi.string().allow('', null).optional(),
          }).optional()
        ).optional(),
        specialInstructions: Joi.string().max(1000).optional(),
        paymentMethod: Joi.string().valid('cash','online','check','charged').required(),
        checkNumber: Joi.string().max(50).optional(),
        poNumber: Joi.string().trim().max(100).optional(),
        paymentTerms: Joi.string().valid("due on cash", "immediate", "net7", "net10", "net15", "net30", "net60").optional(),
        
      });

  const { error, value } = orderSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: 'Validation Error', message: error.details[0].message });
      }

      const dal = getDAL();
      let customerId = req.user.customerId;
      if (!customerId && req.user.userId) {
        const customer = await dal.getCustomerByUserId(req.user.userId);
        customerId = customer?.id || customer?._id;
      }
      if (!customerId) return res.status(400).json({ error: 'Missing customer association' });

      // Calculate items
      const processedItems = value.items.map(item => ({
        ...item,
        lineTotal: item.unitPrice * item.quantity - item.discount,
      }));
      const subtotal = processedItems.reduce((s,i)=>s+i.lineTotal,0);
      const taxAmount = processedItems.reduce((s,i)=>s + i.lineTotal * i.taxRate,0);
      console.log('tax amount is',taxAmount)
      const total = subtotal + taxAmount;
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
        // Fetch customer to use saved address
        const customer = await dal.getCustomerByUserId(req.user.userId);
        const customerAddrString = typeof customer?.address === 'string' ? customer.address : joinAddress(customer?.address);
        normalizedDelivery = parseAddressString(customerAddrString);
      }

      const orderData = {
        orderNumber,
        customerId,
        items: processedItems,
        subtotal,
        taxAmount,
        total,
        status: 'pending',
        deliveryAddress: normalizedDelivery,
        specialInstructions: value.specialInstructions,
        paymentMethod: value.paymentMethod,
        isPaidOnDelivery: value.paymentMethod === 'cash',
        isPaidOnline: value.paymentMethod === 'online',
        poNumber: value.poNumber,
        paymentTerms: value.paymentTerms,
       
      
      };

      const order = await dal.createSalesOrder({
        ...orderData,
        createdBy: req.user.userId, // ensure movements have a performer
      });

      logger.info('Order created by customer', { 
        orderId: order.id, 
        customerId, 
        total,
        poNumber: order.poNumber,
        paymentTerms: order.paymentTerms,
        orderData: {
          poNumber: orderData.poNumber,
          paymentTerms: orderData.paymentTerms
        }
      });

      res.status(201).json({
        message: 'Order created successfully',
        order: {
          ...((typeof order.toJSON === 'function') ? order.toJSON() : order),
          deliveryAddressString: value.deliveryAddress && typeof value.deliveryAddress === 'string' ? value.deliveryAddress : joinAddress(normalizedDelivery),
        }
      });
    } catch (error) { next(error); }
  }

  async listInvoices(req, res, next) {
    try {
      const { page = 1, limit = 20, status, dateFrom, dateTo } = req.query;
      const dal = getDAL();
      let customerId = req.user.customerId;
      if (!customerId && req.user.userId) {
        const customer = await dal.getCustomerByUserId(req.user.userId);
        customerId = customer?.id || customer?._id;
      }
      if (!customerId) return res.status(400).json({ error: 'Missing customer association' });
      const filters = { customerId };
      if (status) filters.status = status;
      if (dateFrom) filters.startDate = dateFrom;
      if (dateTo) filters.endDate = dateTo;
      const result = await dal.listInvoices(filters, { page: parseInt(page), limit: parseInt(limit) });
      res.json({ invoices: result.data, pagination: result.pagination });
    } catch (error) { next(error); }
  }

  async getInvoice(req, res, next) {
    try {
      const invoiceId = req.params.invoiceId;
      const dal = getDAL();
      let customerId = req.user.customerId;
      if (!customerId && req.user.userId) {
        const customer = await dal.getCustomerByUserId(req.user.userId);
        customerId = customer?.id || customer?._id;
      }
      const invoice = await dal.getInvoiceById(invoiceId, { populate: ['customerId','salesOrderId'] });
      const ownerId = this._toId(invoice?.customerId);
      if (!invoice || (customerId && ownerId !== this._toId(customerId))) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      res.json({ invoice });
    } catch (error) { next(error); }
  }

  /**
   * Create an invoice from a customer-owned order
   * Body: { orderId: string, paymentMethod?: 'cash'|'online', notes?: string }
   */
  async createInvoiceFromOrder(req, res, next) {
    try {
      const schema = Joi.object({
        orderId: Joi.string().required(),
        paymentMethod: Joi.string().valid('cash','online','check','charged').optional(),
        checkNumber: Joi.string().max(50).optional(),
        notes: Joi.string().max(1000).optional(),
      });
      const { error, value } = schema.validate(req.body);
      if (error) return res.status(400).json({ error: 'Validation Error', message: error.details[0].message });

      const dal = getDAL();
      let customerId = req.user.customerId;
      if (!customerId && req.user.userId) {
        const customer = await dal.getCustomerByUserId(req.user.userId);
        customerId = customer?.id || customer?._id;
      }
      if (!customerId) return res.status(400).json({ error: 'Missing customer association' });

      // Ensure order exists and belongs to this customer
      const order = await dal.getSalesOrderById(value.orderId);
      if (!order || order.customerId?.toString() !== customerId.toString()) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check if an invoice already exists for this order
      const existing = await dal.getInvoiceByOrderId(value.orderId).catch(()=>null);
      if (existing) {
        return res.status(200).json({ alreadyExisted: true, invoice: existing });
      }

      // Build invoice data from order
      const invoiceData = {
        customerId,
        orderId: order._id,
        salesOrderId: order._id,
        items: order.items.map(it => ({
          productId: it.productId,
          productName: it.productName || it.name,
          name: it.name,
          sku: it.sku,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount || 0,
          taxRate: typeof it.taxRate === 'number' ? it.taxRate : 0,
        })),
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        
        total: order.total,
        paymentTerms: order.paymentTerms,
        poNumber: order.poNumber,
        paymentMethod: value.paymentMethod || order.paymentMethod,
        // Customer-portal invoices are considered paid immediately
        status: 'paid',
        amountPaid: order.total,
        balance: 0,
        notes: value.notes,
        createdBy: req.user.userId,
      };
      console.log('invoice tax is',invoiceData.taxAmount);
      const invoice = await dal.createInvoice(invoiceData);
      return res.status(201).json({ message: 'Invoice generated successfully', invoice });
    } catch (error) { next(error); }
  }

  async markInvoicePrinted(req, res, next) {
    try {
      const dal = getDAL();
      let customerId = req.user.customerId;
      if (!customerId && req.user.userId) {
        const customer = await dal.getCustomerByUserId(req.user.userId);
        customerId = customer?.id || customer?._id;
      }
      const invoice = await dal.getInvoiceById(req.params.invoiceId);
      const ownerId = this._toId(invoice?.customerId);
      if (!invoice || (customerId && ownerId !== this._toId(customerId))) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      const updated = await dal.updateInvoice(invoice.id || invoice._id, { isPrinted: true });
      return res.json({ message: 'Invoice marked as printed', invoice: updated });
    } catch (error) { next(error); }
  }
}

module.exports = new CustomerPortalController();
