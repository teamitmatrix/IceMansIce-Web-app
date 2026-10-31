const dal = require("../dal/MongoDAL");
const logger = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

/**
 * Push client changes to server for offline sync
 */
async function pushChanges(clientId, clientVersion, changes) {
  try {
    logger.info(`Processing ${changes.length} changes from client ${clientId}`);

    const processed = [];
    const conflicts = [];
    const errors = [];

    for (const change of changes) {
      try {
        const result = await processChange(clientId, clientVersion, change);
        processed.push(result);
      } catch (error) {
        if (error.name === "ConflictError") {
          conflicts.push({
            entityType: change.entityType,
            entityId: change.entityId,
            conflictType: error.conflictType,
            serverVersion: error.serverVersion,
            clientVersion: error.clientVersion,
            message: error.message,
          });
        } else {
          errors.push({
            entityType: change.entityType,
            entityId: change.entityId,
            error: error.message,
          });
        }
      }
    }

    return {
      processed: processed.length,
      conflicts,
      errors,
    };
  } catch (error) {
    logger.error("Error processing client changes:", error);
    throw error;
  }
}

/**
 * Process a single change from client
 */
async function processChange(clientId, clientVersion, change) {
  const { entityType, entityId, operation, payload, timestamp } = change;

  // Check for conflicts
  if (entityId && operation !== "create") {
    const conflict = await checkForConflict(
      entityType,
      entityId,
      clientVersion
    );
    if (conflict) {
      throw conflict;
    }
  }

  // Process the change based on operation
  switch (operation) {
    case "create":
      return await createEntity(entityType, payload, clientId, timestamp);
    case "update":
      return await updateEntity(
        entityType,
        entityId,
        payload,
        clientId,
        timestamp
      );
    case "delete":
      return await deleteEntity(entityType, entityId, clientId, timestamp);
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/**
 * Check for conflicts between client and server versions
 */
async function checkForConflict(entityType, entityId, clientVersion) {
  try {
    // Get current server version
    const serverEntity = await dal.getEntity(entityType, entityId);

    if (!serverEntity) {
      return null; // Entity doesn't exist, no conflict
    }

    // Compare versions (this is a simplified version check)
    if (serverEntity.version !== clientVersion) {
      return {
        name: "ConflictError",
        conflictType: "version-mismatch",
        serverVersion: serverEntity.version,
        clientVersion: clientVersion,
        message: "Server version differs from client version",
      };
    }

    return null;
  } catch (error) {
    logger.error("Error checking for conflicts:", error);
    return null;
  }
}

/**
 * Create a new entity
 */
async function createEntity(entityType, payload, clientId, timestamp) {
  try {
    // Add sync metadata
    const entityData = {
      ...payload,
      version: uuidv4(),
      createdAt: timestamp,
      updatedAt: timestamp,
      syncMetadata: {
        clientId,
        lastSync: new Date(),
        createdBy: clientId,
      },
    };

    const entity = await dal.createEntity(entityType, entityData);

    // Queue for sync to other clients
    await queueForSync(entityType, entity._id, "create", entityData, clientId);

    return {
      entityType,
      entityId: entity._id,
      operation: "create",
      status: "success",
    };
  } catch (error) {
    logger.error(`Error creating entity ${entityType}:`, error);
    throw error;
  }
}

/**
 * Update an existing entity
 */
async function updateEntity(
  entityType,
  entityId,
  payload,
  clientId,
  timestamp
) {
  try {
    // Add sync metadata
    const updateData = {
      ...payload,
      version: uuidv4(),
      updatedAt: timestamp,
      syncMetadata: {
        clientId,
        lastSync: new Date(),
        updatedBy: clientId,
      },
    };

    const entity = await dal.updateEntity(entityType, entityId, updateData);

    if (!entity) {
      throw new Error("Entity not found");
    }

    // Queue for sync to other clients
    await queueForSync(entityType, entityId, "update", updateData, clientId);

    return {
      entityType,
      entityId,
      operation: "update",
      status: "success",
    };
  } catch (error) {
    logger.error(`Error updating entity ${entityType} ${entityId}:`, error);
    throw error;
  }
}

/**
 * Delete an entity
 */
async function deleteEntity(entityType, entityId, clientId, timestamp) {
  try {
    const deleted = await dal.deleteEntity(entityType, entityId);

    if (!deleted) {
      throw new Error("Entity not found");
    }

    // Queue for sync to other clients
    await queueForSync(entityType, entityId, "delete", null, clientId);

    return {
      entityType,
      entityId,
      operation: "delete",
      status: "success",
    };
  } catch (error) {
    logger.error(`Error deleting entity ${entityType} ${entityId}:`, error);
    throw error;
  }
}

/**
 * Queue entity for sync to other clients
 */
async function queueForSync(
  entityType,
  entityId,
  operation,
  payload,
  clientId
) {
  try {
    const syncItem = {
      entityType,
      entityId,
      operation,
      payload,
      clientId,
      timestamp: new Date(),
      status: "pending",
    };

    await dal.createSyncQueueItem(syncItem);
  } catch (error) {
    logger.error("Error queuing for sync:", error);
    // Don't throw - this shouldn't fail the main operation
  }
}

/**
 * Pull server changes for offline sync
 */
async function pullChanges(clientId, since, entityTypes, limit) {
  try {
    logger.info(`Pulling changes for client ${clientId} since ${since}`);

    // Get changes since the specified timestamp
    const changes = await dal.getSyncQueueItems(
      {
        clientId: { $ne: clientId }, // Exclude changes from this client
        timestamp: { $gt: new Date(since) },
        entityType: entityTypes ? { $in: entityTypes.split(",") } : undefined,
        status: "pending",
      },
      limit
    );

    // Get current server version
    const serverVersion = uuidv4();

    // Mark these items as synced for this client
    await markItemsAsSynced(
      changes.map((item) => item._id),
      clientId
    );

    // Format changes for client
    const formattedChanges = changes.map((item) => ({
      entityType: item.entityType,
      entityId: item.entityId,
      operation: item.operation,
      payload: item.payload,
      timestamp: item.timestamp,
      version: item.version || uuidv4(),
    }));

    return {
      serverVersion,
      changes: formattedChanges,
      hasMore: changes.length === limit,
      nextSince:
        changes.length > 0 ? changes[changes.length - 1].timestamp : since,
    };
  } catch (error) {
    logger.error("Error pulling changes:", error);
    throw error;
  }
}

/**
 * Mark sync queue items as synced for a specific client
 */
async function markItemsAsSynced(itemIds, clientId) {
  try {
    await dal.updateSyncQueueItems(itemIds, {
      $addToSet: { syncedClients: clientId },
      $set: { lastSyncedAt: new Date() },
    });
  } catch (error) {
    logger.error("Error marking items as synced:", error);
  }
}

/**
 * Get sync status for a client
 */
async function getSyncStatus(clientId) {
  try {
    // Get last sync time
    const lastSyncItem = await dal.getLastSyncItem(clientId);
    const lastSync = lastSyncItem ? lastSyncItem.timestamp : null;

    // Get pending changes count
    const pendingChanges = await dal.getPendingChangesCount(clientId);

    // Get current server version
    const serverVersion = uuidv4();

    // Determine sync status
    let syncStatus = "synced";
    if (pendingChanges > 0) {
      syncStatus = "pending";
    }
    if (lastSync && Date.now() - lastSync.getTime() > 24 * 60 * 60 * 1000) {
      syncStatus = "stale";
    }

    return {
      clientId,
      lastSync,
      serverVersion,
      clientVersion: lastSyncItem ? lastSyncItem.version : null,
      pendingChanges,
      syncStatus,
    };
  } catch (error) {
    logger.error("Error getting sync status:", error);
    throw error;
  }
}

/**
 * Resolve a sync conflict
 */
async function resolveConflict(
  clientId,
  entityType,
  entityId,
  resolution,
  clientData,
  serverData
) {
  try {
    logger.info(
      `Resolving conflict for ${entityType} ${entityId} with resolution: ${resolution}`
    );

    let resolvedEntity;
    let newVersion;

    switch (resolution) {
      case "client-wins":
        resolvedEntity = await updateEntity(
          entityType,
          entityId,
          clientData,
          clientId,
          new Date()
        );
        newVersion = resolvedEntity.version;
        break;

      case "server-wins":
        // Keep server version, no action needed
        resolvedEntity = await dal.getEntity(entityType, entityId);
        newVersion = resolvedEntity.version;
        break;

      case "merge":
        // Merge client and server data (simplified implementation)
        const mergedData = { ...serverData, ...clientData };
        resolvedEntity = await updateEntity(
          entityType,
          entityId,
          mergedData,
          clientId,
          new Date()
        );
        newVersion = resolvedEntity.version;
        break;

      default:
        throw new Error(`Unknown resolution strategy: ${resolution}`);
    }

    return {
      resolvedEntity,
      newVersion,
    };
  } catch (error) {
    logger.error("Error resolving conflict:", error);
    throw error;
  }
}

/**
 * Clear sync queue for a client
 */
async function clearSyncQueue(clientId, entityType) {
  try {
    const filter = { clientId };
    if (entityType) {
      filter.entityType = entityType;
    }

    const result = await dal.clearSyncQueue(filter);

    return {
      clearedCount: result.deletedCount || 0,
    };
  } catch (error) {
    logger.error("Error clearing sync queue:", error);
    throw error;
  }
}

module.exports = {
  pushChanges,
  pullChanges,
  getSyncStatus,
  resolveConflict,
  clearSyncQueue,
};
