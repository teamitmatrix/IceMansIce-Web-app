// const dal = require("../dal/MongoDAL");
const MongoDAL = require("../dal/MongoDAL");
const dal = new MongoDAL();
const logger = require("../utils/logger");
const csv = require("csv-parser");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

/**
 * Get routes with filtering and pagination
 */
async function getRoutes(filters = {}) {
  try {
    const { date, driverId, status, page = 1, limit = 20 } = filters;

    const query = {};

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    if (driverId) {
      query.driverId = driverId;
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [routes, total] = await Promise.all([
      dal.listRoutes(query, { skip, limit }),
      dal.listRoutesCount(query),
    ]);

    return {
      routes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Error getting routes:", error);
    throw error;
  }
}

/**
 * Get a specific route by ID
 */
async function getRouteById(routeId) {
  try {
    const route = await dal.getRouteById(routeId);

    if (!route) {
      return null;
    }

    // Populate driver and customer information
    if (route.driverId) {
      const driver = await dal.getUserById(route.driverId);
      if (driver) {
        route.driverName = driver.name;
      }
    }

    // Populate customer information for stops
    if (route.stops && route.stops.length > 0) {
      for (let i = 0; i < route.stops.length; i++) {
        const stop = route.stops[i];
        if (stop.customerId) {
          const customer = await dal.getCustomerById(stop.customerId);
          if (customer) {
            route.stops[i].customerName = customer.name;
            route.stops[i].customerAddress = customer.address;
          }
        }
      }
    }

    return route;
  } catch (error) {
    logger.error("Error getting route by ID:", error);
    throw error;
  }
}

/**
 * Create a new route
 */
async function createRoute(routeData) {
  try {
    // Validate required fields
    if (!routeData.date || !routeData.driverId || !routeData.stops) {
      throw new Error("Date, driver ID, and stops are required");
    }

    // Validate stops
    if (!Array.isArray(routeData.stops) || routeData.stops.length === 0) {
      throw new Error("At least one stop is required");
    }

    // Validate driver exists
    const driver = await dal.getUserById(routeData.driverId);
    if (!driver || driver.role !== "Driver") {
      throw new Error("Invalid driver ID");
    }

    // Validate customers exist
    for (const stop of routeData.stops) {
      if (stop.customerId) {
        const customer = await dal.getCustomerById(stop.customerId);
        if (!customer) {
          throw new Error(`Customer not found: ${stop.customerId}`);
        }
      }
    }

    // Create route object
    const route = {
      ...routeData,
      // _id: uuidv4(),
      status: "planned",
      createdAt: new Date(),
      updatedAt: new Date(),
      version: uuidv4(),
    };

    // Save route
    const createdRoute = await dal.createRoute(route);

    logger.info(
      `Route created: ${createdRoute._id} for driver ${routeData.driverId}`
    );

    return createdRoute;
  } catch (error) {
    logger.error("Error creating route:", error);
    throw error;
  }
}

/**
 * Update a route
 */
async function updateRoute(routeId, updateData) {
  try {
    // Check if route exists
    const existingRoute = await dal.getRouteById(routeId);
    if (!existingRoute) {
      return null;
    }

    // Validate driver if being updated
    if (updateData.driverId) {
      const driver = await dal.getUserById(updateData.driverId);
      if (!driver || driver.role !== "Driver") {
        throw new Error("Invalid driver ID");
      }
    }

    // Validate customers if stops are being updated
    if (updateData.stops) {
      for (const stop of updateData.stops) {
        if (stop.customerId) {
          const customer = await dal.getCustomerById(stop.customerId);
          if (!customer) {
            throw new Error(`Customer not found: ${stop.customerId}`);
          }
        }
      }
    }

    // Update route
    const updatedRoute = await dal.updateRoute(routeId, {
      ...updateData,
      updatedAt: new Date(),
      version: uuidv4(),
    });

    logger.info(`Route updated: ${routeId}`);

    return updatedRoute;
  } catch (error) {
    logger.error("Error updating route:", error);
    throw error;
  }
}

/**
 * Delete a route
 */
async function deleteRoute(routeId) {
  try {
    // Check if route exists
    const existingRoute = await dal.getRouteById(routeId);
    if (!existingRoute) {
      return false;
    }

    // Check if route can be deleted (not in progress or completed)
    if (
      existingRoute.status === "in-progress" ||
      existingRoute.status === "completed"
    ) {
      throw new Error("Cannot delete route that is in progress or completed");
    }

    // Delete route
    const deleted = await dal.deleteRoute(routeId);

    if (deleted) {
      logger.info(`Route deleted: ${routeId}`);
    }

    return deleted;
  } catch (error) {
    logger.error("Error deleting route:", error);
    throw error;
  }
}

/**
 * Import routes from CSV file
 */
async function importRoutesFromCSV(file, date, driverId) {
  try {
    if (!file || !date || !driverId) {
      throw new Error("File, date, and driver ID are required");
    }

    // Validate driver exists
    const driver = await dal.getUserById(driverId);
    if (!driver || driver.role !== "Driver") {
      throw new Error("Invalid driver ID");
    }

    const results = [];
    const errors = [];
    let rowNumber = 1;

    return new Promise((resolve, reject) => {
      fs.createReadStream(file.path)
        .pipe(csv())
        .on("data", (data) => {
          try {
            // Parse CSV row
            const routeData = parseCSVRow(data, date, driverId);
            results.push(routeData);
          } catch (error) {
            errors.push({
              row: rowNumber,
              error: error.message,
            });
          }
          rowNumber++;
        })
        .on("end", async () => {
          try {
            // Create routes from parsed data
            const imported = [];
            for (const routeData of results) {
              try {
                const route = await createRoute(routeData);
                imported.push(route);
              } catch (error) {
                errors.push({
                  row: "N/A",
                  error: `Failed to create route: ${error.message}`,
                });
              }
            }

            // Clean up uploaded file
            fs.unlinkSync(file.path);

            resolve({
              imported: imported.length,
              errors,
            });
          } catch (error) {
            reject(error);
          }
        })
        .on("error", (error) => {
          reject(error);
        });
    });
  } catch (error) {
    logger.error("Error importing routes from CSV:", error);
    throw error;
  }
}

/**
 * Parse CSV row into route data
 */
function parseCSVRow(data, date, driverId) {
  // Expected CSV columns: customerId,sequence,estimatedDuration,specialInstructions
  const { customerId, sequence, estimatedDuration, specialInstructions } = data;

  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  if (!sequence || isNaN(parseInt(sequence))) {
    throw new Error("Valid sequence number is required");
  }

  return {
    date: new Date(date),
    driverId,
    stops: [
      {
        customerId: customerId.trim(),
        sequence: parseInt(sequence),
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : 30,
        specialInstructions: specialInstructions
          ? specialInstructions.trim()
          : "",
      },
    ],
  };
}

/**
 * Assign a driver to a route
 */
async function assignDriver(routeId, driverId) {
  try {
    // Check if route exists
    const existingRoute = await dal.getRouteById(routeId);
    if (!existingRoute) {
      return null;
    }

    // Validate driver
    const driver = await dal.getUserById(driverId);
    if (!driver || driver.role !== "Driver") {
      throw new Error("Invalid driver ID");
    }

    // Check if route can be assigned (not completed)
    if (existingRoute.status === "completed") {
      throw new Error("Cannot assign driver to completed route");
    }

    // Update route
    const updatedRoute = await dal.updateRoute(routeId, {
      driverId,
      updatedAt: new Date(),
      version: uuidv4(),
    });

    logger.info(`Driver ${driverId} assigned to route ${routeId}`);

    return updatedRoute;
  } catch (error) {
    logger.error("Error assigning driver to route:", error);
    throw error;
  }
}

/**
 * Start a route
 */
async function startRoute(routeId) {
  try {
    // Check if route exists
    const existingRoute = await dal.getRouteById(routeId);
    if (!existingRoute) {
      return null;
    }

    // Check if route can be started
    if (existingRoute.status !== "planned") {
      throw new Error("Route can only be started if it is planned");
    }

    if (!existingRoute.driverId) {
      throw new Error("Route must have a driver assigned to start");
    }

    // Update route status
    const updatedRoute = await dal.updateRoute(routeId, {
      status: "in-progress",
      startedAt: new Date(),
      updatedAt: new Date(),
      version: uuidv4(),
    });

    logger.info(`Route ${routeId} started`);

    return updatedRoute;
  } catch (error) {
    logger.error("Error starting route:", error);
    throw error;
  }
}

/**
 * Complete a route
 */
async function completeRoute(routeId) {
  try {
    // Check if route exists
    const existingRoute = await dal.getRouteById(routeId);
    if (!existingRoute) {
      return null;
    }

    // Check if route can be completed
    if (existingRoute.status !== "in-progress") {
      throw new Error("Route can only be completed if it is in progress");
    }

    // Check if all stops are completed
    const allStopsCompleted = existingRoute.stops.every(
      (stop) => stop.completed
    );
    if (!allStopsCompleted) {
      throw new Error(
        "All stops must be completed before completing the route"
      );
    }

    // Update route status
    const updatedRoute = await dal.updateRoute(routeId, {
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
      version: uuidv4(),
    });

    logger.info(`Route ${routeId} completed`);

    return updatedRoute;
  } catch (error) {
    logger.error("Error completing route:", error);
    throw error;
  }
}

/**
 * Complete a specific stop on a route
 */
async function completeStop(routeId, stopId, completionData) {
  try {
    // Check if route exists
    const existingRoute = await dal.getRouteById(routeId);
    if (!existingRoute) {
      return false;
    }

    // Check if route is in progress
    if (existingRoute.status !== "in-progress") {
      throw new Error("Route must be in progress to complete stops");
    }

    // Find and update the stop
    const stopIndex = existingRoute.stops.findIndex(
      (stop) => stop._id === stopId
    );
    if (stopIndex === -1) {
      throw new Error("Stop not found");
    }

    // Update stop
    existingRoute.stops[stopIndex] = {
      ...existingRoute.stops[stopIndex],
      ...completionData,
      completed: true,
      completedAt: new Date(),
    };

    // Update route
    const updatedRoute = await dal.updateRoute(routeId, {
      stops: existingRoute.stops,
      updatedAt: new Date(),
      version: uuidv4(),
    });

    logger.info(`Stop ${stopId} completed on route ${routeId}`);

    return true;
  } catch (error) {
    logger.error("Error completing stop:", error);
    throw error;
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
};
