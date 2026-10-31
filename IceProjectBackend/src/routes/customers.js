const express = require("express");
const Joi = require("joi");

const { requireAuth } = require("../middleware/auth");
const { requireRole, requireCustomer } = require("../middleware/rbac");
const { getDAL } = require("../dal");
const logger = require("../utils/logger");

const router = express.Router();

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
// Helper: sanitize customer fields for driver scope (hide financial/terms fields)
const sanitizeCustomerForDriver = (cust) => {
  if (!cust) return cust;
  const obj = typeof cust.toJSON === "function" ? cust.toJSON() : (typeof cust.toObject === "function" ? cust.toObject() : { ...cust });
  if (!obj.id) {
    const raw = obj._id || cust._id || cust.id;
    if (raw) obj.id = raw.toString ? raw.toString() : String(raw);
  }
  // Remove unwanted fields for driver scope
  delete obj.balance;
  delete obj.creditLimit;
  delete obj.paymentTerms;
  delete obj.isActive;
  return obj;
};
const createCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).max(128).optional(),
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]+$/)
    .optional(),
  address: Joi.string().optional().allow('', null),
   paymentTerms: Joi.string()
    .valid("immediate", "net15", "net30", "net60")
    .default("immediate"),
  creditLimit: Joi.number().min(0).default(0),
  notes: Joi.string().max(1000).optional(),
});

const updateCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]+$/)
    .optional(),
  address: Joi.string().optional().allow('', null),
  paymentTerms: Joi.string()
    .valid("immediate", "net15", "net30", "net60")
    .optional(),
  creditLimit: Joi.number().min(0).optional(),
  notes: Joi.string().max(1000).optional(),
  isActive: Joi.boolean().optional(),
  balance: Joi.number().min(0).optional(),
  balanceDue: Joi.number().min(0).optional(),
  balanceOverdue: Joi.number().min(0).optional(),
  balancePaid: Joi.number().min(0).optional(),
  balanceUnpaid: Joi.number().min(0).optional(),
  });

router.get(
  "/",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Accountant"]),
  async (req, res, next) => {
    try {
      const {
        search,
        page = 1,
        limit = 20,
        sortBy = "name",
        sortOrder = "asc",
      } = req.query;

      const dal = getDAL();
      const result = await dal.listCustomers({
        search,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder,
      });

      const isDriver = (req.user?.role || "").toLowerCase() === "driver";
      const customers = isDriver
        ? (result.data || []).map((c) => sanitizeCustomerForDriver(c))
        : result.data;

      res.json({
        customers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
          pages: Math.ceil(result.total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);



router.post(
  "/",
  requireAuth,
  requireRole(["Admin", "SalesRep"]),
  async (req, res, next) => {
    try {
      // Convert address object to string BEFORE validation
      const payload = { ...req.body };
      if (payload.address !== undefined) {
        payload.address = joinAddress(payload.address);
      }

      const { error, value } = createCustomerSchema.validate(payload);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      const customer = await dal.createCustomer(value);

      logger.info("Customer created", {
        customerId: customer.id,
        name: customer.name,
        createdBy: req.user.userId,
      });

      res.status(201).json({
        message: "Customer created successfully",
        customer,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Accountant", "customer", "driver",]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
      console.log("req.params.id", req.params.id)
      const customer = await dal.getCustomerById(req.params.id);

      if (!customer) {
        return res.status(404).json({
          error: "Customer not found",
          message: "Customer with the specified ID does not exist",
        });
      }

      const isDriver = (req.user?.role || "").toLowerCase() === "driver";
      const safeCustomer = isDriver ? sanitizeCustomerForDriver(customer) : customer;

      res.json({ customer: safeCustomer });
    } catch (error) {
      next(error);
    }
  }
);

// update customer
router.put(
  "/:id",
  requireAuth,
  requireRole(["admin", "SalesRep",'customer']),
  async (req, res, next) => {
    try {
      // Convert address object to string BEFORE validation
      const payload = { ...req.body };
      if (payload.address !== undefined) {
        payload.address = joinAddress(payload.address);
      }

      const { error, value } = updateCustomerSchema.validate(payload);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const dal = getDAL();
      
      // Check email uniqueness if email is being updated
      if (value.email) {
        const normalizedEmail = String(value.email).trim().toLowerCase();
        if (normalizedEmail && normalizedEmail.length > 0) {
          // Get the customer to find the linked user
          const existingCustomer = await dal.getCustomerById(req.params.id);
          if (existingCustomer && existingCustomer.userId) {
            const existingUser = await dal.getUserByEmail(normalizedEmail);
            // Allow if no user found, or if found user is the same one linked to this customer
            if (existingUser && existingUser.id !== existingCustomer.userId.toString()) {
              return res.status(409).json({
                error: "Email already exists",
                message: "A user with this email address already exists",
              });
            }
          }
          value.email = normalizedEmail;
        } else {
          // If email is empty, don't include it in update
          delete value.email;
        }
      }
      
      const customer = await dal.updateCustomer(req.params.id, value);

      if (!customer) {
        return res.status(404).json({
          error: "Customer not found",
          message: "Customer with the specified ID does not exist",
        });
      }

      logger.info("Customer updated", {
        customerId: customer.id,
        updatedBy: req.user.userId,
      });

      res.json({
        message: "Customer updated successfully",
        customer,
      });
    } catch (error) {
      console.log(error);
      next(error);
      
    }
  }
);

router.delete(
  "/:id",
  requireAuth,
  requireRole(["Admin"]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
      // Use cascade deletion to remove linked user as well, with guards
      const deleted = await dal.deleteCustomerCascade(req.params.id);

      if (!deleted) {
        return res.status(404).json({
          error: "Customer not found",
          message: "Customer with the specified ID does not exist",
        });
      }

      logger.info("Customer deleted", {
        customerId: req.params.id,
        deletedBy: req.user.userId,
        cascade: deleted,
      });

      res.json({
        message: "Customer deleted successfully",
        cascade: deleted,
      });
    } catch (error) {
      if (
        error.message ===
        "Cannot delete customer with active orders or invoices"
      ) {
        return res.status(400).json({
          error: "Cannot delete customer",
          message: error.message,
        });
      }
      next(error);
    }
  }
);

// Customer profile endpoint - allows customers to view their own profile
router.get(
  "/det/profile",
  requireAuth,
  async (req, res, next) => {
    try {
      console.log('getting customer data')
      const dal = getDAL();
      
      // For Customer role, find their customer record using their userId
        if (req.user) {
        const customer = await dal.getCustomerByUserId(req.user.userId);
        // console.log("customer profile",customer)
        
        if (!customer) {
          return res.status(404).json({
            error: "Customer profile not found",
            message: "No customer profile associated with this user account",
          });
        }

        res.json({
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            balance: customer.balance,
            creditLimit: customer.creditLimit,
            paymentTerms: customer.paymentTerms,
            createdAt: customer.createdAt,
          },
        });
      } else {
        // For admin/staff roles, they shouldn't use this endpoint
        return res.status(403).json({
          error: "Access denied",
          message: "This endpoint is for customer profiles only",
        });
      }
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

router.get("/", async (req, res) => {
  res.send("Customer route is working!");
});
// Credit application endpoint - allows customers to submit credit applications
router.post(
  "/credit-application",
  requireAuth,
  async (req, res, next) => {
    try {
      // Only customers can submit credit applications
  if (!req.user.role || req.user.role.toLowerCase() !== "customer") {
        return res.status(403).json({
          error: "Access denied",
          message: "This endpoint is for customers only",
        });
      }

      const dal = getDAL();
      const customer = await dal.getCustomerByUserId(req.user.userId);
      
      if (!customer) {
        return res.status(404).json({
          error: "Customer profile not found",
          message: "No customer profile associated with this user account",
        });
      }

      // Store the credit application data (you may want to create a separate model for this)
      const creditApplicationData = {
        customerId: customer.id,
        userId: req.user.userId,
        requestedAmount: req.body.requestedAmount,
        businessInfo: req.body.businessInfo,
        financialInfo: req.body.financialInfo,
        submittedAt: new Date(),
        status: "pending"
      };

      // For now, we'll just log the application and return success
      // In a real system, you'd save this to a CreditApplication model
      logger.info("Credit application submitted", {
        customerId: customer.id,
        userId: req.user.userId,
        requestedAmount: creditApplicationData.requestedAmount,
      });

      res.status(201).json({
        message: "Credit application submitted successfully",
        applicationId: "temp-" + Date.now(), // Temporary ID
        status: "pending"
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id/balance",
  requireAuth,
  requireRole(["Admin", "SalesRep", "Accountant"]),
  async (req, res, next) => {
    try {
      const dal = getDAL();
      const customer = await dal.getCustomerById(req.params.id);

      if (!customer) {
        return res.status(404).json({
          error: "Customer not found",
          message: "Customer with the specified ID does not exist",
        });
      }

      const balance = await dal.listCustomersBalance(req.params.id);
      const recentPayments = await dal.listCustomersPayments(req.params.id, {
        limit: 10,
      });

      res.json({
        customer: {
          id: customer.id,
          name: customer.name,
          balance: balance.currentBalance,
          creditLimit: customer.creditLimit,
          paymentTerms: customer.paymentTerms,
        },
        recentPayments,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     Address:
 *       type: object
 *       properties:
 *         street:
 *           type: string
 *         city:
 *           type: string
 *         state:
 *           type: string
 *         zipCode:
 *           type: string
 *         country:
 *           type: string
 *
 *     Customer:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           readOnly: true
 *         name:
 *           type: string
 *           description: Full name of the customer
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         address:
 *           $ref: '#/components/schemas/Address'
 *         balance:
 *           type: number
 *           default: 0
 *         creditLimit:
 *           type: number
 *           default: 0
 *         paymentTerms:
 *           type: string
 *           enum: [immediate, net15, net30, net60]
 *         taxExempt:
 *           type: boolean
 *           default: false
 *         taxId:
 *           type: string
 *         notes:
 *           type: string
 *         isActive:
 *           type: boolean
 *           default: true
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "64f8abc1234abcd56789ef01"
 *         name: "Ali Khan"
 *         email: "ali@example.com"
 *         phone: "+923001234567"
 *         address:
 *           street: "Main Road"
 *           city: "Mardan"
 *           country: "Pakistan"
 *         balance: 500
 *         creditLimit: 2000
 *         paymentTerms: "net30"
 *         notes: "VIP Customer"
 *         isActive: true
 *         tags: ["priority", "long-term"]
 *
 * tags:
 *   - name: Customers
 *     description: Customer management
 *
 * /customers:
 *   get:
 *     summary: Get a list of customers
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: name
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *     responses:
 *       200:
 *         description: List of customers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Customer'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Validation error
 *
 * /customers/{id}:
 *   get:
 *     summary: Get a customer by ID
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Customer details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Customer not found
 *
 *   put:
 *     summary: Update a customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Customer not found
 *
 *   delete:
 *     summary: Delete a customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 *       400:
 *         description: Cannot delete customer with active orders or invoices
 *       404:
 *         description: Customer not found
 *
 * /customers/{id}/balance:
 *   get:
 *     summary: Get customer balance and recent payments
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Balance details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customer:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string }
 *                     balance: { type: number }
 *                     creditLimit: { type: number }
 *                     paymentTerms: { type: string }
 *                 recentPayments:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Customer not found
 */


module.exports = router;
