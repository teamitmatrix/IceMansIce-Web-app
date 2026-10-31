const { NotImplementedError } = require("../utils/errors");
class IDAL {
  async createCustomer(customerData) {
    throw new NotImplementedError("createCustomer not implemented");
  }

  async getCustomerById(id) {
    throw new NotImplementedError("getCustomerById not implemented");
  }

  async getCustomerByEmail(email) {
    throw new NotImplementedError("getCustomerByEmail not implemented");
  }

  async updateCustomer(id, updateData) {
    throw new NotImplementedError("updateCustomer not implemented");
  }

  async deleteCustomer(id) {
    throw new NotImplementedError("deleteCustomer not implemented");
  }

  async listCustomers(filters = {}, pagination = {}) {
    throw new NotImplementedError("listCustomers not implemented");
  }

  async searchCustomers(term) {
    throw new NotImplementedError("searchCustomers not implemented");
  }

  async updateCustomerBalance(id, amount) {
    throw new NotImplementedError("updateCustomerBalance not implemented");
  }

  async createProduct(productData) {
    throw new NotImplementedError("createProduct not implemented");
  }

  async getProductById(id) {
    throw new NotImplementedError("getProductById not implemented");
  }

  async getProductBySku(sku) {
    throw new NotImplementedError("getProductBySku not implemented");
  }

  async updateProduct(id, updateData) {
    throw new NotImplementedError("updateProduct not implemented");
  }

  async deleteProduct(id) {
    throw new NotImplementedError("deleteProduct not implemented");
  }

  async listProducts(filters = {}, pagination = {}) {
    throw new NotImplementedError("listProducts not implemented");
  }

  async searchProducts(term) {
    throw new NotImplementedError("searchProducts not implemented");
  }

  async adjustProductStock(id, { delta, reason, warehouseId, truckId, notes, adjustedBy }) {
    throw new NotImplementedError("adjustProductStock not implemented");
  }

  async getProductStock(id, location = "global") {
    throw new NotImplementedError("getProductStock not implemented");
  }

  async findLowStockProducts() {
    throw new NotImplementedError("findLowStockProducts not implemented");
  }

  async createSalesOrder(orderData) {
    throw new NotImplementedError("createSalesOrder not implemented");
  }

  async getSalesOrderById(id) {
    throw new NotImplementedError("getSalesOrderById not implemented");
  }

  async getSalesOrderByNumber(orderNumber) {
    throw new NotImplementedError("getSalesOrderByNumber not implemented");
  }

  async updateSalesOrder(id, updateData) {
    throw new NotImplementedError("updateSalesOrder not implemented");
  }

  async deleteSalesOrder(id) {
    throw new NotImplementedError("deleteSalesOrder not implemented");
  }

  async listSalesOrders(filters = {}, pagination = {}) {
    throw new NotImplementedError("listSalesOrders not implemented");
  }

  async approveSalesOrder(id, userId) {
    throw new NotImplementedError("approveSalesOrder not implemented");
  }

  async cancelSalesOrder(id, reason) {
    throw new NotImplementedError("cancelSalesOrder not implemented");
  }

  async assignDriverToOrder(id, driverId) {
    throw new NotImplementedError("assignDriverToOrder not implemented");
  }

  async markOrderShipped(id) {
    throw new NotImplementedError("markOrderShipped not implemented");
  }

  async markOrderDelivered(id) {
    throw new NotImplementedError("markOrderDelivered not implemented");
  }

  async findPendingApprovalOrders() {
    throw new NotImplementedError("findPendingApprovalOrders not implemented");
  }

  async findOrdersByCustomer(customerId) {
    throw new NotImplementedError("findOrdersByCustomer not implemented");
  }

  async findOrdersByDriver(driverId) {
    throw new NotImplementedError("findOrdersByDriver not implemented");
  }

  async createInvoice(invoiceData) {
    throw new NotImplementedError("createInvoice not implemented");
  }

  async getInvoiceById(id) {
    throw new NotImplementedError("getInvoiceById not implemented");
  }

  async getInvoiceByNumber(invoiceNumber) {
    throw new NotImplementedError("getInvoiceByNumber not implemented");
  }

  async updateInvoice(id, updateData) {
    throw new NotImplementedError("updateInvoice not implemented");
  }

  async deleteInvoice(id) {
    throw new NotImplementedError("deleteInvoice not implemented");
  }

  async listInvoices(filters = {}, pagination = {}) {
    throw new NotImplementedError("listInvoices not implemented");
  }

  async markInvoicePaid(id, amount) {
    throw new NotImplementedError("markInvoicePaid not implemented");
  }

  async findOverdueInvoices() {
    throw new NotImplementedError("findOverdueInvoices not implemented");
  }

  async findInvoicesByCustomer(customerId) {
    throw new NotImplementedError("findInvoicesByCustomer not implemented");
  }

  async generateInvoiceNumber() {
    throw new NotImplementedError("generateInvoiceNumber not implemented");
  }

  async createPayment(paymentData) {
    throw new NotImplementedError("createPayment not implemented");
  }

  async getPaymentById(id) {
    throw new NotImplementedError("getPaymentById not implemented");
  }

  async updatePayment(id, updateData) {
    throw new NotImplementedError("updatePayment not implemented");
  }

  async deletePayment(id) {
    throw new NotImplementedError("deletePayment not implemented");
  }

  async listPayments(filters = {}, pagination = {}) {
    throw new NotImplementedError("listPayments not implemented");
  }

  async findPaymentsByCustomer(customerId) {
    throw new NotImplementedError("findPaymentsByCustomer not implemented");
  }

  async findPaymentsByInvoice(invoiceId) {
    throw new NotImplementedError("findPaymentsByInvoice not implemented");
  }

  async getPaymentSummary(startDate, endDate) {
    throw new NotImplementedError("getPaymentSummary not implemented");
  }

  async createInventoryMovement(movementData) {
    throw new NotImplementedError("createInventoryMovement not implemented");
  }

  async getInventoryMovementById(id) {
    throw new NotImplementedError("getInventoryMovementById not implemented");
  }

  async listInventoryMovements(filters = {}, pagination = {}) {
    throw new NotImplementedError("listInventoryMovements not implemented");
  }

  async findMovementsByProduct(productId, options = {}) {
    throw new NotImplementedError("findMovementsByProduct not implemented");
  }

  async findMovementsByLocation(locationType, locationId, options = {}) {
    throw new NotImplementedError("findMovementsByLocation not implemented");
  }

  async getInventorySummary(startDate, endDate) {
    throw new NotImplementedError("getInventorySummary not implemented");
  }

  async getMovementReasonsSummary(startDate, endDate) {
    throw new NotImplementedError("getMovementReasonsSummary not implemented");
  }

  async createRoute(routeData) {
    throw new NotImplementedError("createRoute not implemented");
  }

  async getRouteById(id) {
    throw new NotImplementedError("getRouteById not implemented");
  }

  async getRouteByNumber(routeNumber) {
    throw new NotImplementedError("getRouteByNumber not implemented");
  }

  async updateRoute(id, updateData) {
    throw new NotImplementedError("updateRoute not implemented");
  }

  async deleteRoute(id) {
    throw new NotImplementedError("deleteRoute not implemented");
  }

  async listRoutes(filters = {}, pagination = {}) {
    throw new NotImplementedError("listRoutes not implemented");
  }

  async startRoute(id) {
    throw new NotImplementedError("startRoute not implemented");
  }

  async completeRoute(id) {
    throw new NotImplementedError("completeRoute not implemented");
  }

  async addStopToRoute(id, customerId, sequence) {
    throw new NotImplementedError("addStopToRoute not implemented");
  }

  async updateStopStatus(id, customerId, status, notes) {
    throw new NotImplementedError("updateStopStatus not implemented");
  }

  async findRoutesByDriver(driverId, date) {
    throw new NotImplementedError("findRoutesByDriver not implemented");
  }

  async findActiveRoutes() {
    throw new NotImplementedError("findActiveRoutes not implemented");
  }

  async generateRouteNumber(date) {
    throw new NotImplementedError("generateRouteNumber not implemented");
  }

  async createWarehouse(warehouseData) {
    throw new NotImplementedError("createWarehouse not implemented");
  }

  async getWarehouseById(id) {
    throw new NotImplementedError("getWarehouseById not implemented");
  }

  async getWarehouseByCode(code) {
    throw new NotImplementedError("getWarehouseByCode not implemented");
  }

  async updateWarehouse(id, updateData) {
    throw new NotImplementedError("updateWarehouse not implemented");
  }

  async deleteWarehouse(id) {
    throw new NotImplementedError("deleteWarehouse not implemented");
  }

  async listWarehouses(filters = {}, pagination = {}) {
    throw new NotImplementedError("listWarehouses not implemented");
  }

  async findActiveWarehouses() {
    throw new NotImplementedError("findActiveWarehouses not implemented");
  }

  async createTruck(truckData) {
    throw new NotImplementedError("createTruck not implemented");
  }

  async getTruckById(id) {
    throw new NotImplementedError("getTruckById not implemented");
  }

  async getTruckByCode(code) {
    throw new NotImplementedError("getTruckByCode not implemented");
  }

  async updateTruck(id, updateData) {
    throw new NotImplementedError("updateTruck not implemented");
  }

  async deleteTruck(id) {
    throw new NotImplementedError("deleteTruck not implemented");
  }

  async listTrucks(filters = {}, pagination = {}) {
    throw new NotImplementedError("listTrucks not implemented");
  }

  async assignDriverToTruck(id, driverId) {
    throw new NotImplementedError("assignDriverToTruck not implemented");
  }

  async updateTruckLocation(id, latitude, longitude) {
    throw new NotImplementedError("updateTruckLocation not implemented");
  }

  async findAvailableTrucks() {
    throw new NotImplementedError("findAvailableTrucks not implemented");
  }

  async findTrucksByDriver(driverId) {
    throw new NotImplementedError("findTrucksByDriver not implemented");
  }

  async findTrucksNearLocation(longitude, latitude, maxDistance) {
    throw new NotImplementedError("findTrucksNearLocation not implemented");
  }

  async createUser(userData) {
    throw new NotImplementedError("createUser not implemented");
  }

  async getUserById(id) {
    throw new NotImplementedError("getUserById not implemented");
  }

  async getUserByEmail(email) {
    throw new NotImplementedError("getUserByEmail not implemented");
  }

  async updateUser(id, updateData) {
    throw new NotImplementedError("updateUser not implemented");
  }

  async deleteUser(id) {
    throw new NotImplementedError("deleteUser not implemented");
  }

  async listUsers(filters = {}, pagination = {}) {
    throw new NotImplementedError("listUsers not implemented");
  }

  async findUsersByRole(role) {
    throw new NotImplementedError("findUsersByRole not implemented");
  }

  async validateUserCredentials(email, password) {
    throw new NotImplementedError("validateUserCredentials not implemented");
  }

  async generateRefreshToken(userId) {
    throw new NotImplementedError("generateRefreshToken not implemented");
  }

  async validateRefreshToken(userId, token) {
    throw new NotImplementedError("validateRefreshToken not implemented");
  }

  async removeRefreshToken(userId, token) {
    throw new NotImplementedError("removeRefreshToken not implemented");
  }

  async createSyncQueueItem(itemData) {
    throw new NotImplementedError("createSyncQueueItem not implemented");
  }

  async getSyncQueueItemById(id) {
    throw new NotImplementedError("getSyncQueueItemById not implemented");
  }

  async updateSyncQueueItem(id, updateData) {
    throw new NotImplementedError("updateSyncQueueItem not implemented");
  }

  async listSyncQueueItems(filters = {}, pagination = {}) {
    throw new NotImplementedError("listSyncQueueItems not implemented");
  }

  async findPendingSyncItems(clientId, limit) {
    throw new NotImplementedError("findPendingSyncItems not implemented");
  }

  async findRetryableSyncItems(limit) {
    throw new NotImplementedError("findRetryableSyncItems not implemented");
  }

  async findSyncConflicts(clientId) {
    throw new NotImplementedError("findSyncConflicts not implemented");
  }

  async getSyncStats(clientId, startDate, endDate) {
    throw new NotImplementedError("getSyncStats not implemented");
  }

  async createAuditLog(auditData) {
    throw new NotImplementedError("createAuditLog not implemented");
  }

  async getAuditLogById(id) {
    throw new NotImplementedError("getAuditLogById not implemented");
  }

  async listAuditLogs(filters = {}, pagination = {}) {
    throw new NotImplementedError("listAuditLogs not implemented");
  }

  async findAuditLogsByEntity(entityType, entityId, options = {}) {
    throw new NotImplementedError("findAuditLogsByEntity not implemented");
  }

  async findAuditLogsByActor(actorId, options = {}) {
    throw new NotImplementedError("findAuditLogsByActor not implemented");
  }

  async getAuditSummary(startDate, endDate) {
    throw new NotImplementedError("getAuditSummary not implemented");
  }

  async getUserActivitySummary(startDate, endDate) {
    throw new NotImplementedError("getUserActivitySummary not implemented");
  }

  async getDailySalesReport(date) {
    throw new NotImplementedError("getDailySalesReport not implemented");
  }

  async getCollectionsReport(startDate, endDate) {
    throw new NotImplementedError("getCollectionsReport not implemented");
  }

  async getAgingAccountsReport() {
    throw new NotImplementedError("getAgingAccountsReport not implemented");
  }

  async getRoutePerformanceReport(startDate, endDate) {
    throw new NotImplementedError("getRoutePerformanceReport not implemented");
  }

  async getSalesByItemReport(startDate, endDate) {
    throw new NotImplementedError("getSalesByItemReport not implemented");
  }

  async getInventoryValuationReport() {
    throw new NotImplementedError(
      "getInventoryValuationReport not implemented"
    );
  }

  async getCustomerActivityReport(startDate, endDate) {
    throw new NotImplementedError("getCustomerActivityReport not implemented");
  }
}

module.exports = IDAL;
