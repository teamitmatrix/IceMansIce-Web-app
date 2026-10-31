const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireCustomer } = require('../middleware/rbac');
const controller = require('../controllers/customerPortalController');

const router = express.Router();

// All routes require authenticated customer
router.use(requireAuth, requireCustomer);

// Orders
router.get('/orders', (req,res,next)=>controller.listOrders(req,res,next));
router.get('/orders/:orderId', (req,res,next)=>controller.getOrder(req,res,next));

router.post('/orders', (req,res,next)=>controller.createOrder(req,res,next));

// Invoices
router.get('/invoices', (req,res,next)=>controller.listInvoices(req,res,next));
router.get('/invoices/:invoiceId', (req,res,next)=>controller.getInvoice(req,res,next));
// Create invoice from order (customer-owned)
router.post('/invoices', (req,res,next)=>controller.createInvoiceFromOrder(req,res,next));
// Mark invoice printed
router.put('/invoices/:invoiceId/print', (req,res,next)=>controller.markInvoicePrinted(req,res,next));

// Dashboard
router.get('/dashboard', (req,res,next)=>controller.getDashboard(req,res,next));

module.exports = router;
