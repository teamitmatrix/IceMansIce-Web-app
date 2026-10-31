const routeService = require("../services/routeService");
const logger = require("../utils/logger");
const { ValidationError } = require("../utils/errors");

/**
 * Get all routes with filtering and pagination
 */
async function getRoutes(req, res, next) {
  try {
    const { date, driverId, status, page = 1, limit = 20 } = req.query;

    const result = await routeService.getRoutes({
      date,
      driverId,
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function findRoutesByDriver(req, res, next) {
  try {
    const { driverId } = req.params;
    const { date, status, page = 1, limit = 20 } = req.query;

    if (!driverId) {
      throw new ValidationError("Driver ID is required");
    }

    const result = await routeService.getRoutes({
      driverId,
      date,
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }}

/**
 * Get a specific route by ID
 */
async function getRouteById(req, res, next) {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Route ID is required");
    }

    const route = await routeService.getRouteById(id);

    if (!route) {
      return res.status(404).json({
        success: false,
        error: "Route not found",
      });
    }

    res.json({
      success: true,
      data: route,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new route
 */
async function createRoute(req, res, next) {
  try {
    const routeData = req.body;

    if (!routeData.date || !routeData.driverId || !routeData.stops) {
      throw new ValidationError("Date, driver ID, and stops are required");
    }

    const route = await routeService.createRoute(routeData);

    res.status(201).json({
      success: true,
      data: route,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a route
 */
async function updateRoute(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      throw new ValidationError("Route ID is required");
    }

    const route = await routeService.updateRoute(id, updateData);

    if (!route) {
      return res.status(404).json({
        success: false,
        error: "Route not found",
      });
    }

    res.json({
      success: true,
      data: route,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a route
 */
async function deleteRoute(req, res, next) {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Route ID is required");
    }

    const deleted = await routeService.deleteRoute(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Route not found",
      });
    }

    res.json({
      success: true,
      data: {
        message: "Route deleted successfully",
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Import routes from CSV file
 */
async function importRoutesFromCSV(req, res, next) {
  try {
    if (!req.file) {
      throw new ValidationError("CSV file is required");
    }

    const { date, driverId } = req.body;

    if (!date || !driverId) {
      throw new ValidationError("Date and driver ID are required");
    }

    const result = await routeService.importRoutesFromCSV(
      req.file,
      date,
      driverId
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Assign a driver to a route
 */
async function assignDriver(req, res, next) {
  try {
    const { id } = req.params;
    const { driverId } = req.body;

    if (!id || !driverId) {
      throw new ValidationError("Route ID and driver ID are required");
    }

    const route = await routeService.assignDriver(id, driverId);

    if (!route) {
      return res.status(404).json({
        success: false,
        error: "Route not found",
      });
    }

    res.json({
      success: true,
      data: route,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Start a route
 */
async function startRoute(req, res, next) {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Route ID is required");
    }

    const route = await routeService.startRoute(id);

    if (!route) {
      return res.status(404).json({
        success: false,
        error: "Route not found",
      });
    }

    res.json({
      success: true,
      data: route,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Complete a route
 */
async function completeRoute(req, res, next) {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Route ID is required");
    }

    const route = await routeService.completeRoute(id);

    if (!route) {
      return res.status(404).json({
        success: false,
        error: "Route not found",
      });
    }

    res.json({
      success: true,
      data: route,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Complete a specific stop on a route
 */
async function completeStop(req, res, next) {
  try {
    const { id, stopId } = req.params;
    const { notes, actualDuration } = req.body;

    if (!id || !stopId) {
      throw new ValidationError("Route ID and stop ID are required");
    }

    const result = await routeService.completeStop(id, stopId, {
      notes,
      actualDuration,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "Route or stop not found",
      });
    }

    res.json({
      success: true,
      data: {
        message: "Stop completed successfully",
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  importRoutesFromCSV,
  assignDriver,
  startRoute,
  completeRoute,
  completeStop,
  findRoutesByDriver
};
