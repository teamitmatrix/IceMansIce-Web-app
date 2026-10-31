const syncService = require("../services/syncService");
const logger = require("../utils/logger");
const { ValidationError } = require("../utils/errors");

/**
 * Push client changes to server for offline sync
 */
async function pushChanges(req, res, next) {
  try {
    const { clientId, clientVersion, changes } = req.body;

    if (!clientId || !clientVersion || !Array.isArray(changes)) {
      throw new ValidationError(
        "Client ID, client version, and changes array are required"
      );
    }

    const result = await syncService.pushChanges(
      clientId,
      clientVersion,
      changes
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
 * Pull server changes for offline sync
 */
async function pullChanges(req, res, next) {
  try {
    const { since, clientId, entityTypes, limit = 100 } = req.query;

    if (!since || !clientId) {
      throw new ValidationError("Since timestamp and client ID are required");
    }

    const result = await syncService.pullChanges(
      clientId,
      since,
      entityTypes,
      parseInt(limit)
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
 * Get sync status for a client
 */
async function getSyncStatus(req, res, next) {
  try {
    const { clientId } = req.query;

    if (!clientId) {
      throw new ValidationError("Client ID is required");
    }

    const status = await syncService.getSyncStatus(clientId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Resolve a sync conflict
 */
async function resolveConflict(req, res, next) {
  try {
    const {
      clientId,
      entityType,
      entityId,
      resolution,
      clientData,
      serverData,
    } = req.body;

    if (!clientId || !entityType || !entityId || !resolution) {
      throw new ValidationError(
        "Client ID, entity type, entity ID, and resolution are required"
      );
    }

    const result = await syncService.resolveConflict(
      clientId,
      entityType,
      entityId,
      resolution,
      clientData,
      serverData
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
 * Clear sync queue for a client
 */
async function clearSyncQueue(req, res, next) {
  try {
    const { clientId, entityType } = req.body;

    if (!clientId) {
      throw new ValidationError("Client ID is required");
    }

    const result = await syncService.clearSyncQueue(clientId, entityType);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  pushChanges,
  pullChanges,
  getSyncStatus,
  resolveConflict,
  clearSyncQueue,
};
