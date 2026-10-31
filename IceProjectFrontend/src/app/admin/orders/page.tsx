"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Eye, Truck, User, Calendar, DollarSign, Search, Download, ChevronLeft, ChevronRight, RefreshCw, Filter, Trash2, CheckSquare, Square } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/axios";
import OrderUpdateModal from "@/components/admin/updateOrder";
import { toast } from "sonner";

interface Order {
  _id: string;
  orderNumber: string;
  // API may return populated customer object, just an id string, or null
  customerId?: {
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
  } | string | null;
  // Items may be absent in some summaries
  items?: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  status: string;
  orderDate: string;
  requestedDeliveryDate: string;
  actualDeliveryDate?: string;
  assignedDriver?: {
    _id: string;
    name: string;
  };
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };
      if (searchQuery) params.search = searchQuery;

      const response = await api.get(`/orders`, { params });
      const orders = response.data?.orders || response.data?.data || [];
      const pag = response.data?.pagination || {};
      setOrders(orders);

      if (pag.total !== undefined || pag.pages !== undefined) {
        setPagination((prev) => ({
          ...prev,
          total: pag.total || 0,
          pages: pag.pages || 0,
        }));
      } else {
        // Fallback: if no pagination object, calculate from orders length
        console.log("No pagination in response, using order count as fallback");
        setPagination((prev) => ({
          ...prev,
          total: orders.length,
          pages: Math.ceil(orders.length / prev.limit),
        }));
      }
      setSelectedOrders(new Set()); // Clear selections when fetching new data
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleGenerateInvoice = async (order: any) => {
    try {
      setGeneratingInvoice(true);
      const response = await api.post(`/admin/invoice`, { order: order });
      // Handle successful invoice generation (e.g., show a success message)
      if (response.data && response.data.invoice) {
        toast.success("Invoice generated successfully");
      }

    } catch (error:any) {
      // show exact error message from server if available
      const errMsg = error.response?.data?.message || "Failed to generate invoice";
      toast.error(errMsg);
    }finally {
      setGeneratingInvoice(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSelectedOrders(new Set()); // Clear selections when searching
  };

  const handleFilter = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSelectedOrders(new Set()); // Clear selections when filtering
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleItemsPerPageChange = (limit: number) => {
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
  };

  const viewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const closeModal = () => {
    setShowOrderModal(false);
    setSelectedOrder(null);
  };

  // Multi-select functions
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(order => order._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.size === 0) return;

    // Show an undoable toast: wait 5s before executing the delete
  let cancelled = false;
  // Snapshot selection now to avoid race conditions if user changes selection during countdown
  const ids = Array.from(selectedOrders);
  const count = ids.length;
    const toastId = toast.warning(`${count} order${count > 1 ? 's' : ''} will be deleted in 5 seconds`, {
      action: {
        label: "Undo",
        onClick: () => {
          cancelled = true;
          toast.dismiss(toastId);
          toast.info("Deletion cancelled");
        },
      },
      duration: 5000,
    });

    setIsDeleting(true);
    setTimeout(async () => {
      if (cancelled) {
        setIsDeleting(false);
        return;
      }

      try {
        const res = await api.post(`/orders/bulk-delete`, { ids });
        const deleted = res.data?.deleted?.length || 0;
        const skipped = res.data?.skipped?.length || 0;
        const failed = res.data?.failed?.length || 0;

        if (deleted > 0) {
          toast.success(`Deleted ${deleted} order${deleted !== 1 ? 's' : ''}`);
        }
        if (skipped > 0) {
          toast.info(`${skipped} skipped (already invoiced)`);
        }
        if (failed > 0) {
          toast.error(`${failed} failed to delete`);
        }

        // Clear selections and refresh the list
        setSelectedOrders(new Set());
        await fetchOrders();
      } catch (error: any) {
        const errMsg = error?.response?.data?.message || 'Bulk delete failed. Please try again.';
        console.error('Error deleting orders:', error);
        toast.error(errMsg);
      } finally {
        setIsDeleting(false);
      }
    }, 5000);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.post(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
      setError("Failed to update order status");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCustomer = (o: Order) =>
    o && o.customerId && typeof o.customerId === "object"
      ? (o.customerId as NonNullable<Order["customerId"]> & { name?: string; email?: string; phone?: string })
      : null;

  // Export handler - simple CSV export
  const handleExport = async (format: "csv" | "excel") => {
    try {
      if (format === "csv") {
        const headers = ["Order Number", "Customer Name", "Total", "Status", "Order Date", "Delivery Date"];
        const csvContent = [
          headers.join(","),
          ...orders.map(o => [
            o.orderNumber,
            `"${getCustomer(o)?.name || ""}"`,
            o.total,
            o.status,
            o.orderDate,
            o.requestedDeliveryDate || ""
          ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  if (loading && orders.length === 0) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          </div>
          <Card className="p-12 text-center">
            <div className="text-red-500 mb-4">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Error Loading Orders
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchOrders} variant="outline">
              Try Again
            </Button>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage customer orders and track deliveries</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {selectedOrders.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 flex-1 sm:flex-initial"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden xs:inline">{isDeleting ? 'Deleting...' : `Delete (${selectedOrders.size})`}</span>
                <span className="xs:hidden">{isDeleting ? '...' : `Del (${selectedOrders.size})`}</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrders}
              className="flex items-center gap-2 flex-1 sm:flex-initial"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden xs:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv")}
              className="flex items-center gap-2 flex-1 sm:flex-initial"
            >
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm text-gray-600">From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[130px] sm:w-[160px] text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm text-gray-600">To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[130px] sm:w-[160px] text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next: Record<string, any> = { ...filters };
                  if (dateFrom) next.dateFrom = dateFrom; else delete next.dateFrom;
                  if (dateTo) next.dateTo = dateTo; else delete next.dateTo;
                  setFilters(next);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <Filter className="w-4 h-4 mr-1" />
                Apply
              </Button>
              {(filters.dateFrom || filters.dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    const { dateFrom: _df, dateTo: _dt, ...rest } = filters as any;
                    setFilters(rest);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Selection Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {orders.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-xs sm:text-sm"
              >
                {selectedOrders.size === orders.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="hidden xs:inline">{selectedOrders.size === orders.length ? 'Deselect All' : 'Select All'}</span>
                <span className="xs:hidden">{selectedOrders.size === orders.length ? 'None' : 'All'}</span>
              </Button>
            )}
            {selectedOrders.size > 0 && (
              <span className="text-xs sm:text-sm text-gray-600">
                {selectedOrders.size} selected
              </span>
            )}
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {loading && orders.length === 0 ? (
            // Loading skeleton
            [...Array(5)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </Card>
            ))
          ) : orders.length === 0 ? (
            <Card className="p-12 text-center">
              <ShoppingCart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600">No orders match your current search criteria.</p>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order._id} className="p-4 md:p-6 hover:shadow-md transition-shadow">
                {/* Mobile-first layout */}
                <div className="space-y-4">
                  {/* Header row - Order number, customer, and amount */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Selection checkbox */}
                      <button
                        onClick={() => toggleOrderSelection(order._id)}
                        className="mt-1 p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        {selectedOrders.has(order._id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {order.orderNumber}
                            </h3>
                          </div>
                        </div>

                        {/* Customer and status below order number (mobile) */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            <span className="truncate">{getCustomer(order)?.name || "Unknown Customer"}</span>
                          </div>
                          <Badge
                            variant={
                              order.status === "completed" ? "default" :
                                order.status === "processing" ? "secondary" :
                                  order.status === "approved" ? "outline" : "destructive"
                            }
                            className="w-fit"
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl md:text-2xl font-bold text-gray-900">
                        ${Number(order.total || 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {order.items?.length || 0} items
                      </div>
                    </div>
                  </div>

                  {/* Order Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Order Date</div>
                        <div>{formatDate(order.orderDate)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Truck className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Delivery Date</div>
                        <div>{formatDate(order.requestedDeliveryDate)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Contact Info */}
                  {getCustomer(order)?.email && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Email:</span> <span className="break-all">{getCustomer(order)?.email}</span>
                      {getCustomer(order)?.phone && (
                        <span className="block md:inline md:ml-4">
                          <span className="font-medium">Phone:</span> {getCustomer(order)?.phone}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Delivery Address */}
                  {order.deliveryAddress && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Delivery:</span>{" "}
                      <span className="break-words">
                        {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
                      </span>
                    </div>
                  )}

                  {/* Action buttons at bottom right */}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => viewOrder(order)}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setSelectedOrder(order)}>
                      Edit
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleGenerateInvoice(order)}>
                      {generatingInvoice ? "Generating..." : "Generate Invoice"}
                    </Button>

                    {order.status === "approved" && (
                      <Button size="sm" onClick={() => updateOrderStatus(order._id, "processing")}>
                        <Truck className="w-4 h-4 mr-1" />
                        Process
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.total > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {pagination.total > 0
                  ? `Showing ${(pagination.page - 1) * pagination.limit + 1} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} orders`
                  : "No orders found"
                }
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {pagination.pages > 5 && (
                    <>
                      <span className="px-2 text-gray-400">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.pages)}
                        className="w-10"
                      >
                        {pagination.pages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* order update modal */}
        {selectedOrder && (
          <OrderUpdateModal
            path="/admin/order/"
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onUpdated={fetchOrders}
          />
        )}


        {/* Order Details Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Order Details - {selectedOrder.orderNumber}
                  </h2>
                  <Button variant="ghost" onClick={closeModal}>
                    ×
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Order Information */}
                  <div className="space-y-4">
                    <Card className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Customer Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Name:</span>{" "}
                          {getCustomer(selectedOrder)?.name || "Unknown customer"}
                        </div>
                        <div>
                          <span className="font-medium">Email:</span>{" "}
                          {getCustomer(selectedOrder)?.email || "-"}
                        </div>
                        <div>
                          <span className="font-medium">Phone:</span>{" "}
                          {getCustomer(selectedOrder)?.phone || "-"}
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Order Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Order Date:</span>{" "}
                          {formatDate(selectedOrder?.orderDate)}
                        </div>
                        <div>
                          <span className="font-medium">Delivery Date:</span>{" "}
                          {formatDate(selectedOrder?.requestedDeliveryDate)}
                        </div>
                        {/* Status and driver hidden per request */}
                      </div>
                    </Card>

                    {selectedOrder?.deliveryAddress && (
                      <Card className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">
                          Delivery Address
                        </h3>
                        <div className="text-sm">
                          <p>{selectedOrder?.deliveryAddress?.street}</p>
                          <p>
                            {selectedOrder?.deliveryAddress?.city},{" "}
                            {selectedOrder?.deliveryAddress?.state}{" "}
                            {selectedOrder?.deliveryAddress?.zipCode}
                          </p>
                        </div>
                      </Card>
                    )}

                    {selectedOrder?.specialInstructions && (
                      <Card className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">
                          Special Instructions
                        </h3>
                        <p className="text-sm text-gray-600">
                          {selectedOrder?.specialInstructions}
                        </p>
                      </Card>
                    )}
                  </div>

                  {/* Order Items and Totals */}
                  <div className="space-y-4">
                    <Card className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Order Items
                      </h3>
                      <div className="space-y-3">
                        {selectedOrder?.items?.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {item.productName}
                              </p>
                              <p className="text-sm text-gray-600">
                                Qty: {item.quantity} × $
                                {item.unitPrice.toFixed(2)}
                              </p>
                            </div>
                            <p className="font-medium text-gray-900">
                              ${item.lineTotal.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Order Totals
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>${selectedOrder.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax:</span>
                          <span>${selectedOrder.taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-2">
                          <span>Total:</span>
                          <span>${selectedOrder.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6">
                  <Button variant="outline" onClick={closeModal}>
                    Close
                  </Button>
                  {selectedOrder.status === "approved" && (
                    <Button
                      onClick={() =>
                        updateOrderStatus(selectedOrder._id, "processing")
                      }
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      Start Processing
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
