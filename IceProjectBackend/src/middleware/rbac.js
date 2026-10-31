const { AuthorizationError } = require("../utils/errors");
const logger = require("../utils/logger");

// const requireRole = (role) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return res.status(401).json({
//         error: "Authentication required",
//         message: "User must be authenticated",
//       });
//     }

//     if (req.user.role !== role) {
//       logger.warn("Access denied - insufficient role", {
//         userId: req.user.id,
//         userRole: req.user.role,
//         requiredRole: role,
//         path: req.path,
//       });

//       return res.status(403).json({
//         error: "Insufficient permissions",
//         message: `Role '${role}' required`,
//       });
//     }

//     next();
//   };
// };

const normalize = (r) => (typeof r === 'string' ? r.toLowerCase() : r);

const requireRole = (roles) => {
  const roleList = (Array.isArray(roles) ? roles : [roles]).map(normalize);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        message: "User must be authenticated",
      });
    }

    const userRole = normalize(req.user.role);
    
    // Enhanced logging for driver routes
    if (req.path.includes('/driver/')) {
      logger.info("RBAC check for driver route", {
        path: req.path,
        method: req.method,
        userId: req.user.id,
        userRole: userRole,
        requiredRoles: roleList,
        hasValidRole: roleList.includes(userRole),
      });
    }
    
    if (!roleList.includes(userRole)) {
      logger.warn("Access denied - insufficient role", {
        userId: req.user.id,
        userRole: userRole,
        requiredRoles: roleList,
        path: req.path,
        method: req.method,
      });
      
      return res.status(403).json({
        error: "Insufficient permissions",
        message: `One of roles [${roleList.join(", ")}] required, but user has role '${userRole}'`,
      });
    }

    next();
  };
};

const requireAnyRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        message: "User must be authenticated",
      });
    }

    const userRole = normalize(req.user.role);
    const wanted = roles.map(normalize);
    if (!wanted.includes(userRole)) {
      logger.warn("Access denied - insufficient role", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
      });

      return res.status(403).json({
        error: "Insufficient permissions",
        message: `One of roles [${roles.join(", ")}] required`,
      });
    }

    next();
  };
};

const requireAllRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        message: "User must be authenticated",
      });
    }

    const userRole = normalize(req.user.role);
    const wanted = roles.map(normalize);
    const hasAllRoles = wanted.every((role) => userRole === role);

    if (!hasAllRoles) {
      logger.warn("Access denied - insufficient roles", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
      });

      return res.status(403).json({
        error: "Insufficient permissions",
        message: `All roles [${roles.join(", ")}] required`,
      });
    }

    next();
  };
};

const requireAdmin = (req, res, next) => {
  return requireRole("admin")(req, res, next);
};

const requireSalesRep = (req, res, next) => {
  return requireAnyRole(["admin", "salesrep"])(req, res, next);
};

const requireDriver = (req, res, next) => {
  return requireAnyRole(["admin", "driver"])(req, res, next);
};

const requireCustomer = (req, res, next) => {
  return requireRole("customer")(req, res, next);
};

const requireAccountant = (req, res, next) => {
  return requireAnyRole(["admin", "accountant"])(req, res, next);
};

const requireStaff = (req, res, next) => {
  return requireAnyRole(["admin", "salesrep", "driver", "accountant"])(
    req,
    res,
    next
  );
};

const requireOwnership = (resourceType, resourceIdField = "id") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        message: "User must be authenticated",
      });
    }

    if (req.user.role === "admin") {
      return next();
    }

    const resourceId = req.params[resourceIdField] || req.body[resourceIdField];

    if (!resourceId) {
      return res.status(400).json({
        error: "Resource ID required",
        message: `Resource ID is required for ownership check`,
      });
    }

    if (req.user.role === "customer") {
      if (resourceType === "customer" && resourceId === req.user.customerId) {
        return next();
      }

      logger.warn("Customer access denied - not their resource", {
        userId: req.user.id,
        resourceType,
        resourceId,
        path: req.path,
      });

      return res.status(403).json({
        error: "Access denied",
        message: "You can only access your own resources",
      });
    }
    next();
  };
};

const requireCustomerAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      message: "User must be authenticated",
    });
  }

  const customerId = req.params.customerId || req.body.customerId;

  if (!customerId) {
    return res.status(400).json({
      error: "Customer ID required",
      message: "Customer ID is required for access check",
    });
  }

  if (req.user.role === "admin") {
    return next();
  }

  if (req.user.role === "salesrep") {
    return next();
  }

  if (req.user.role === "accountant") {
    return next();
  }

  if (req.user.role === "driver") {
    return next();
  }

  if (req.user.role === "customer" && customerId === req.user.customerId) {
    return next();
  }

  logger.warn("Customer data access denied", {
    userId: req.user.id,
    userRole: req.user.role,
    customerId,
    path: req.path,
  });

  return res.status(403).json({
    error: "Access denied",
    message: "You do not have permission to access this customer data",
  });
};

const requireInvoiceAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      message: "User must be authenticated",
    });
  }

  const invoiceId = req.params.invoiceId || req.body.invoiceId;

  if (!invoiceId) {
    return res.status(400).json({
      error: "Invoice ID required",
      message: "Invoice ID is required for access check",
    });
  }

  if (req.user.role === "admin") {
    return next();
  }

  if (req.user.role === "salesrep") {
    return next();
  }

  if (req.user.role === "accountant") {
    return next();
  }

  if (req.user.role === "driver") {
    return next();
  }

  if (req.user.role === "customer") {
    return next();
  }

  logger.warn("Invoice access denied", {
    userId: req.user.id,
    userRole: req.user.role,
    invoiceId,
    path: req.path,
  });

  return res.status(403).json({
    error: "Access denied",
    message: "You do not have permission to access this invoice",
  });
};

const requireRouteAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      message: "User must be authenticated",
    });
  }

  const routeId = req.params.routeId || req.body.routeId;

  if (!routeId) {
    return res.status(400).json({
      error: "Route ID required",
      message: "Route ID is required for access check",
    });
  }

  if (req.user.role === "admin") {
    return next();
  }

  if (req.user.role === "driver") {
    return next();
  }

  if (req.user.role === "salesrep") {
    return next();
  }

  logger.warn("Route access denied", {
    userId: req.user.id,
    userRole: req.user.role,
    routeId,
    path: req.path,
  });

  return res.status(403).json({
    error: "Access denied",
    message: "You do not have permission to access route data",
  });
};

module.exports = {
  requireRole,
  requireAnyRole,
  requireAllRoles,
  requireAdmin,
  requireSalesRep,
  requireDriver,
  requireCustomer,
  requireAccountant,
  requireStaff,
  requireOwnership,
  requireCustomerAccess,
  requireInvoiceAccess,
  requireRouteAccess,
};
