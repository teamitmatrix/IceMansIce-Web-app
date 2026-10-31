"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  DollarSign,
  CreditCard,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Trash2,
  ArrowLeft,
  Printer,
  CheckSquare,
  Square,
  Bluetooth,
} from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { buildEscPosInvoice } from "@/lib/escpos";
import { sendToBluetoothPrinter } from "@/lib/bluetoothPrinter";

interface Invoice {
  _id: string;
  invoiceNumber: number;
  customerId?: {
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string | {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
  } | null;
  salesOrderId?: {
    _id: string;
    orderNumber: string;
    poNumber?: string;
    paymentTerms?: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    lineTotal: number;
  }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: string;
  issueDate: string;
  dueDate?: string;
  paymentTerms: string;
  poNumber?: string;
  paymentMethod?: string;
  checkNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string>("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors

      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };
      if (searchQuery) {
        params.search = searchQuery;
      }

      console.log("Fetching invoices with params:", params); // Debug log
      console.log("API URL:", `${process.env.NEXT_PUBLIC_API_URL || "https://icemans-ice.onrender.com/"}/admin/invoices`); // Debug log

      const response = await api.get(`/admin/invoices`, { params });

      console.log("Invoice response:", response.data); // Debug log
      console.log("Response data structure:", JSON.stringify(response.data, null, 2)); // Deep debug

      // Handle the response structure: { success: true, data: { data: [...], pagination: {...} } }
      const responseData = response.data?.data || {};
      console.log("Extracted responseData:", responseData); // Debug
      const invoicesData = responseData.data || [];
      console.log("Extracted invoicesData:", invoicesData); // Debug
      console.log("Is invoicesData an array?", Array.isArray(invoicesData)); // Debug

      // Ensure we always have an array
      const finalInvoicesData = Array.isArray(invoicesData) ? invoicesData : [];
      setInvoices(finalInvoicesData);

      // Clear selections when data changes
      setSelectedInvoices(new Set());

      // Update pagination from the response
      const responsePagination = responseData.pagination;
      console.log("Extracted pagination:", responsePagination); // Debug
      if (responsePagination) {
        setPagination((prev) => ({
          ...prev,
          total: responsePagination.total || 0,
          pages: responsePagination.pages || 0,
        }));
      } else {
        // Fallback: if no pagination object, calculate from invoices length
        console.log("No pagination in response, using invoice count as fallback");
        setPagination((prev) => ({
          ...prev,
          total: finalInvoicesData.length,
          pages: Math.ceil(finalInvoicesData.length / prev.limit),
        }));
      }
    } catch (error: any) {
      console.error("Error fetching invoices:", error);

      // Provide more specific error messages
      if (error.response?.status === 401) {
        setError("Authentication failed. Please log in again.");
      } else if (error.response?.status === 403) {
        setError("Access denied. You don't have permission to view invoices.");
      } else if (error.response?.status === 404) {
        setError("Invoice service not found. Please contact support.");
      } else if (error.message?.includes("Network")) {
        setError("Network error. Please check your internet connection and try again.");
      } else {
        setError(error.response?.data?.message || "Failed to load invoices. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, filters]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Debug log for pagination changes
  useEffect(() => {
    console.log("Pagination state changed:", pagination);
  }, [pagination]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedInvoices(new Set()); // Clear selections when searching
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilter = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
    setSelectedInvoices(new Set()); // Clear selections when filtering
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    console.log("Page change requested:", page, "Current pagination:", pagination); // Debug log
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleItemsPerPageChange = (limit: number) => {
    console.log("Limit change requested:", limit, "Current pagination:", pagination); // Debug log
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
  };

  // Selection handlers
  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(invoiceId)) {
        newSelected.delete(invoiceId);
      } else {
        newSelected.add(invoiceId);
      }
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    if (selectedInvoices.size === invoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(invoices.map(inv => inv._id)));
    }
  };

  // Delete handlers
  const handleDeleteSelected = async () => {
    if (selectedInvoices.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedInvoices.size} invoice${selectedInvoices.size > 1 ? 's' : ''}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);

      // Delete invoices one by one
      const deletePromises = Array.from(selectedInvoices).map(invoiceId =>
        api.delete(`/invoices/${invoiceId}`)
      );

      await Promise.all(deletePromises);

      // Clear selection and refresh data
      setSelectedInvoices(new Set());
      await fetchInvoices();

      // Show success message (you might want to add a toast notification here)
      console.log(`Successfully deleted ${selectedInvoices.size} invoice(s)`);

    } catch (error: any) {
      console.error("Error deleting invoices:", error);
      setError(error.response?.data?.message || "Failed to delete invoices. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const viewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const closeModal = () => {
    setShowInvoiceModal(false);
    setSelectedInvoice(null);
  };

  // PDF download removed

  const openPaymentDialog = (invoice: Invoice, status: string) => {
    setSelectedInvoiceForPayment(invoice);
    setNewStatus(status);
    if (status === 'paid') {
      setPaymentAmount(invoice.total.toString());
    } else {
      // For partial and overdue, keep current amountPaid
      setPaymentAmount((invoice.amountPaid || 0).toString());
    }
    setShowPaymentDialog(true);
  };

  const handleStatusChange = async (invoice: Invoice, newStatus: string) => {
    // If status is already the same as current AND it's a payment status, show dialog to add more payment
    if ((newStatus === 'paid' || newStatus === 'partial' || newStatus === 'overdue') && invoice.status === newStatus) {
      // Same status selected - show dialog to update payment amount
      openPaymentDialog(invoice, newStatus);
      return;
    }

    // If changing to paid, partial, or overdue, show payment dialog
    if (newStatus === 'paid' || newStatus === 'partial' || newStatus === 'overdue') {
      openPaymentDialog(invoice, newStatus);
    } else {
      // For other statuses, update without payment dialog
      try {
        await api.put(`/admin/invoice/${invoice._id}`, { status: newStatus });
        setInvoices((prev) =>
          prev.map((inv) =>
            inv._id === invoice._id ? { ...inv, status: newStatus } : inv
          )
        );
        toast.success("Invoice status updated successfully");
        console.log(`Invoice ${invoice._id} status updated to ${newStatus}`);
      } catch (err: any) {
        console.error("Failed to update invoice status:", err);
        toast.error(
          err.response?.data?.message || "Failed to update invoice status"
        );
      }
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedInvoiceForPayment) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (amount > selectedInvoiceForPayment.total) {
      toast.error("Payment amount cannot exceed invoice total");
      return;
    }

    try {
      await api.put(`/admin/invoice/${selectedInvoiceForPayment._id}`, {
        status: newStatus,
        amountPaid: amount
      });
      toast.success(`Invoice updated: ${newStatus} - ${formatCurrency(amount)} paid`);
      setShowPaymentDialog(false);
      setSelectedInvoiceForPayment(null);
      setPaymentAmount("");
      setNewStatus("");
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update invoice");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "paid":
        return "bg-green-100 text-green-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-4 h-4" />;
      case "overdue":
        return <AlertTriangle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getPaymentStatus = (invoice: Invoice) => {
    if (invoice.status === "paid" || invoice.balance <= 0) {
      return { status: "Paid", color: "text-green-600" };
    }
    if (invoice.dueDate && new Date() > new Date(invoice.dueDate)) {
      return { status: "Overdue", color: "text-red-600" };
    }
    return { status: "Pending", color: "text-yellow-600" };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
      amount || 0
    );

  const formatAddress = (address?: { street?: string; city?: string; state?: string; zipCode?: string } | string) => {
    if (!address) return "No address provided";
    
    // If address is a string, return it directly
    if (typeof address === 'string') {
      return address.trim() || "No address provided";
    }
    
    // If address is an object, format it
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "No address provided";
  };

  // Consolidate visual status into a single badge to avoid duplication
  const getDisplayStatus = (invoice: Invoice) => {
    const isPaid = invoice.status?.toLowerCase() === "paid" || invoice.balance <= 0;
    const isPartial = invoice.status?.toLowerCase() === "partial" || (invoice.amountPaid > 0 && invoice.balance > 0);
    const isOverdue =
      !isPaid && !isPartial && invoice.dueDate ? new Date() > new Date(invoice.dueDate) : false;

    if (isPaid) {
      return { label: "Paid", color: "bg-green-100 text-green-800", icon: <CheckCircle className="w-4 h-4" /> };
    }
    if (isPartial) {
      return { label: "Partial", color: "bg-orange-100 text-orange-800", icon: <DollarSign className="w-4 h-4" /> };
    }
    if (isOverdue) {
      return { label: "Overdue", color: "bg-red-100 text-red-800", icon: <AlertTriangle className="w-4 h-4" /> };
    }

    const s = (invoice.status || "").toLowerCase();
    if (s === "sent") return { label: "Sent", color: "bg-blue-100 text-blue-800", icon: <FileText className="w-4 h-4" /> };
    if (s === "pending") return { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-4 h-4" /> };
    if (s === "approved") return { label: "Approved", color: "bg-purple-100 text-purple-800", icon: <CheckCircle className="w-4 h-4" /> };
    if (s === "draft") return { label: "Draft", color: "bg-gray-100 text-gray-800", icon: <FileText className="w-4 h-4" /> };
    if (s === "cancelled") return { label: "Cancelled", color: "bg-gray-100 text-gray-800", icon: <FileText className="w-4 h-4" /> };

    return { label: invoice.status || "—", color: "bg-gray-100 text-gray-800", icon: <FileText className="w-4 h-4" /> };
  };

  // Only date range filtering is supported now
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  if (loading && invoices.length === 0) {
    return (
      // <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
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
      // </AdminLayout>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage customer invoices and payments</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {selectedInvoices.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="flex items-center gap-2 flex-1 sm:flex-initial"
            >
              <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-pulse' : ''}`} />
              <span className="hidden xs:inline">{isDeleting ? 'Deleting...' : `Delete (${selectedInvoices.size})`}</span>
              <span className="xs:hidden">{isDeleting ? '...' : `Del (${selectedInvoices.size})`}</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvoices}
            disabled={loading}
            className="flex items-center gap-2 flex-1 sm:flex-initial"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {invoices.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900"
                >
                  {selectedInvoices.size === invoices.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span>
                    {selectedInvoices.size === invoices.length ? 'Deselect All' : 'Select All'}
                  </span>
                </button>
                {selectedInvoices.size > 0 && (
                  <span className="text-xs sm:text-sm text-blue-600 font-medium">
                    {selectedInvoices.size} selected
                  </span>
                )}
              </div>
            )}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search invoices..."
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
                className="w-[140px] sm:w-[160px] text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm text-gray-600">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[140px] sm:w-[160px] text-sm"
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

      {/* Results Info and Items Per Page */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <p className="text-xs sm:text-sm text-gray-600">
            {pagination.total > 0
              ? `Showing ${((pagination.page - 1) * pagination.limit) + 1} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}`
              : "No invoices"
            }
          </p>
          {selectedInvoices.size > 0 && (
            <p className="text-xs sm:text-sm text-blue-600 font-medium">
              {selectedInvoices.size} selected
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Per page:</label>
          <select
            value={pagination.limit}
            onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
            className="border border-gray-300 rounded px-2 sm:px-3 py-1 text-xs sm:text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Invoice List */}
      {error ? (
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Invoices</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="text-xs text-gray-500 mb-4">
            <p>API URL: {process.env.NEXT_PUBLIC_API_URL || "https://pwa-backend-fxw6.onrender.com/"}</p>
            <p>Check browser console for more details</p>
          </div>
          <Button onClick={fetchInvoices} variant="outline">
            Try Again
          </Button>
        </Card>
      ) : loading ? (
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
      ) : invoices.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => {
            const displayStatus = getDisplayStatus(invoice);
            const isSelected = selectedInvoices.has(invoice._id);
            const statusOptions = [
              "draft",
              "pending",
              "approved",
              "sent",
              "partial",
              "paid",
              "overdue",
              "cancelled",
            ];

            return (
              <Card key={invoice._id} className={`p-4 md:p-6 hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                {/* Mobile-first layout */}
                <div className="space-y-4">
                  {/* Header row - Selection, Invoice number and amount */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Selection checkbox */}
                      <button
                        onClick={() => handleSelectInvoice(invoice._id)}
                        className="mt-1 flex-shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-lg">{invoice.invoiceNumber}</span>
                        </div>
                        {/* Status badge below invoice number (mobile) */}
                        <div className="flex gap-4">
                          <Badge className={`${displayStatus.color} flex items-center gap-1 w-fit`}>
                          {displayStatus.icon}
                          <span>{displayStatus.label}</span>
                        </Badge>
                        <select
                          value={invoice.status}
                          onChange={(e) => handleStatusChange(invoice, e.target.value)}
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                          ))}
                        </select>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">{formatCurrency(invoice.total)}</p>
                      <p className="text-sm text-gray-600">Balance: {formatCurrency(invoice.balance)}</p>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{invoice.customerId?.name || "Unknown Customer"}</p>
                        <p className="text-gray-600 truncate">{invoice.customerId?.email || "—"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{formatDate(invoice.issueDate)}</p>
                        {invoice.dueDate && (
                          <p className="text-gray-600">Due: {formatDate(invoice.dueDate)}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium">
                          {invoice.paymentTerms === "immediate" ? "Immediate" : invoice.paymentTerms?.toUpperCase?.() || "—"}
                        </p>
                        {invoice.paymentMethod && (
                          <p className="text-gray-600 capitalize">{invoice.paymentMethod}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons at bottom right */}
                  <div className="flex justify-end gap-2">
                    {/* Show Add Payment button for partial/overdue invoices with remaining balance */}
                    {(invoice.status === 'partial' || invoice.status === 'overdue') && (invoice.balance ?? 0) > 0 && (
                      <Button 
                        variant="outline"
                        size="sm" 
                        onClick={() => openPaymentDialog(invoice, invoice.status)}
                        className="border-green-500 text-green-600 hover:bg-green-50"
                      >
                        + Partial Amount
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => viewInvoice(invoice)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.total > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={pagination.page === 1}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                let pageNum: number;
                if (pagination.pages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.pages - 2) {
                  pageNum = pagination.pages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={pagination.page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.pages)}
              disabled={pagination.page === pagination.pages}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-center mt-2">
            <p className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </p>
          </div>
        </Card>
      )}

      {/* Invoice Details - Full Page View */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
            {/* Minimal Button Bar */}
            <div className="mb-4 flex items-center justify-between print:hidden">
              <Button
                onClick={closeModal}
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50 border border-gray-300 p-2 h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  onClick={async () => {
                    if (!selectedInvoice) return;
                    setPrinting(true);
                    setPrintError("");
                    try {
                      if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
                        throw new Error('Bluetooth printing is not supported on this device/browser. Please use Chrome on Android or a compatible browser.');
                      }

                      const payload = buildEscPosInvoice({
                        invoiceNumber: selectedInvoice.invoiceNumber,
                        date: new Date(selectedInvoice.issueDate || selectedInvoice.createdAt || Date.now()).toLocaleString(),
                        company: {
                          name: "Iceman's Ice Company LLC",
                          addressLines: [
                            '501 Florida Central pkwy , Unit # 521952, Longwood, Florida 32752',
                            'Email: moe@icemansice.com'
                          ],
                          phone: '407-310-5007'
                        },
                        customer: { name: selectedInvoice.customerId?.name, phone: selectedInvoice.customerId?.phone, email: selectedInvoice.customerId?.email, address: '' },
                        items: selectedInvoice.items.map(it => ({ name: it.productName, qty: it.quantity, unitPrice: it.unitPrice, total: it.lineTotal })),
                        subtotal: selectedInvoice.subtotal,
                        tax: selectedInvoice.taxAmount,
                        total: selectedInvoice.total,
                        poNumber: selectedInvoice.poNumber,
                        paymentTerms: selectedInvoice.paymentTerms,
                        footerNote: 'Thank you for your business!',
                      });

                      await sendToBluetoothPrinter(payload);
                      // Mark as printed in backend (admin)
                      try {
                        await api.put(`/admin/invoice/${selectedInvoice._id}/print`, {
                          printerName: 'Web Bluetooth',
                          deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
                        });
                      } catch (markErr: any) {
                        console.error('Failed to record admin print event:', markErr);
                        // Non-fatal for printing; proceed with toast
                      }
                      toast.success('Sent to Bluetooth printer');
                    } catch (e: any) {
                      console.error('Bluetooth print error (admin):', e);
                      let errorMessage = 'Bluetooth print failed';
                      if (e?.message) errorMessage = e.message;
                      else if (e?.name === 'NotFoundError') errorMessage = 'No Bluetooth printer found. Ensure your printer is on and paired.';
                      else if (e?.name === 'SecurityError') errorMessage = 'Bluetooth access denied. Check browser permissions.';
                      else if (e?.name === 'NetworkError') errorMessage = 'Connection to printer failed. Ensure the printer is in range and powered on.';
                      setPrintError(errorMessage);
                      toast.error(errorMessage);
                    } finally {
                      setPrinting(false);
                    }
                  }}
                  disabled={printing}
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-gray-50 border border-gray-300 p-2 h-8 w-8"
                >
                  <Bluetooth className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => window.print()}
                  disabled={printing}
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-gray-50 border border-gray-300 p-2 h-8 w-8"
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Invoice Content */}
            <div id="invoice-print" className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden print:shadow-none print:border-none">
              {/* Invoice Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 border-b">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company Info */}
                  <div>
                    <h1 id="company-name" className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Iceman's Ice Company LLC</h1>
                    <p className="text-sm sm:text-base text-gray-600">
                      501 Florida Central pkwy<br />
                      Unit # 521952, Longwood, Florida 32752<br />
                      Phone: 407-310-5007<br />
                      Email: moe@icemansice.com
                    </p>
                  </div>

                  {/* Invoice Info */}
                  <div className="md:text-right">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 heading">Invoice Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between md:justify-end gap-4">
                        <span className="text-gray-600 details">Invoice #:</span>
                        <span className="font-medium details">{selectedInvoice.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between md:justify-end gap-4">
                        <span className="text-gray-600 details">Date:</span>
                        <span className="font-medium details">{formatDate(selectedInvoice.issueDate)}</span>
                      </div>
                      {selectedInvoice.dueDate && (
                        <div className="flex justify-between md:justify-end gap-4">
                          <span className="text-gray-600 details">Due Date:</span>
                          <span className="font-medium details">{formatDate(selectedInvoice.dueDate)}</span>
                        </div>
                      )}
                      {selectedInvoice.paymentMethod && (
                        <div>
                          <div className="flex justify-between md:justify-end gap-4">
                            <span className="text-gray-600 details">Payment Method:</span>
                            <span className="font-medium details">{selectedInvoice.paymentMethod}</span>
                          </div>
                          {selectedInvoice.paymentMethod === 'check' && selectedInvoice.checkNumber && (
                            <div className="flex justify-between md:justify-end gap-4 mt-2">
                              <span className="text-gray-600 details">Check Number:</span>
                              <span className="font-medium details">{selectedInvoice.checkNumber}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-4 sm:p-6 border-b">
                <h3 id="bill-to" className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Bill To:</h3>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <p className="font-medium text-gray-900 text-sm sm:text-base">{selectedInvoice.customerId?.name || "Unknown Customer"}</p>
                  {selectedInvoice.customerId?.address && (
                    <p className="text-gray-600 text-sm mt-1 whitespace-normal break-words">{formatAddress(selectedInvoice.customerId.address)}</p>
                  )}
                  <p className="text-gray-600 text-sm">{selectedInvoice.customerId?.phone || "—"}</p>
                  <p className="text-gray-600 text-sm">{selectedInvoice.customerId?.email || "—"}</p>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="p-4 sm:p-6">
                <h3 id="items" className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Items:</h3>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm">Product</th>
                          <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm">Qty</th>
                          <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm">Unit Price</th>
                          <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items.map((item, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm">{item.productName}</td>
                            <td className="py-3 px-2 sm:px-4 text-right text-xs sm:text-sm">{item.quantity}</td>
                            <td className="py-3 px-2 sm:px-4 text-right text-xs sm:text-sm">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-3 px-2 sm:px-4 text-right font-medium text-xs sm:text-sm">{formatCurrency(item.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="mt-6 border-t-2 border-gray-200 pt-4">
                  <div className="text-sm sm:text-base mb-4">
                    <p><span className="font-bold pr-2">PO Number:</span> {selectedInvoice.salesOrderId?.poNumber || 'N/A'}</p>
                    <p><span className="font-bold pr-2">Payment Terms:</span> {selectedInvoice.salesOrderId?.paymentTerms || 'N/A'}</p>
                  </div>
                  <div className="flex justify-end">
                    <div className="w-full sm:w-64 space-y-2">
                      <div className="flex justify-between text-sm sm:text-base">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(selectedInvoice.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm sm:text-base">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-medium">{formatCurrency(selectedInvoice.taxAmount)}</span>
                      </div>
                      <div className="flex justify-between text-lg sm:text-xl font-bold border-t pt-2">
                        <span className="heading">Total:</span>
                        <span className="heading">{formatCurrency(selectedInvoice.total)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                        <span className="text-green-600 font-semibold">Amount Paid:</span>
                        <span className="text-green-600 font-semibold">
                          {formatCurrency(selectedInvoice.amountPaid || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-base sm:text-lg font-bold border-t pt-2">
                        <span className={selectedInvoice.balance > 0 ? "text-red-600" : "text-green-600"}>
                          Balance:
                        </span>
                        <span className={selectedInvoice.balance > 0 ? "text-red-600" : "text-green-600"}>
                          {formatCurrency(selectedInvoice.balance || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 p-4 sm:p-6 border-t">
                <div className="text-center text-gray-600 text-xs sm:text-sm">
                  <p>Thank you for your business!</p>
                  {selectedInvoice.notes && (
                    <p className="mt-2 italic">{selectedInvoice.notes}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Print-only CSS */}
          <style jsx global>{`
            @media print {
              @page {
                size: A4;
                margin: 10mm;
              }

              body * {
                visibility: hidden;
              }

              #invoice-print,
              #invoice-print * {
                visibility: visible;
              }

              #invoice-print {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }

              /* Remove all colors and backgrounds */
              #invoice-print * {
                color: black !important;
                background: white !important;
                border-color: black !important;
              }

              /* Remove gradients and colored backgrounds */
              #invoice-print .bg-gradient-to-r,
              #invoice-print .bg-blue-50,
              #invoice-print .bg-indigo-50,
              #invoice-print .bg-gray-50 {
                background: white !important;
              }

              /* Simple borders */
              #invoice-print table {
                border-collapse: collapse;
              }

              #invoice-print th,
              #invoice-print td {
                border: 1px solid black !important;
                padding: 8px !important;
              }

              /* Hide print buttons */
              button,
              .print\\:hidden {
                display: none !important;
              }

              /* Remove shadows and rounded corners */
              #invoice-print,
              #invoice-print * {
                box-shadow: none !important;
                border-radius: 0 !important;
              }
            }
          `}</style>
        </div>
      )}

      {/* Payment Dialog */}
      {showPaymentDialog && selectedInvoiceForPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              {newStatus === 'paid' && 'Mark as Paid'}
              {newStatus === 'partial' && 'Enter Partial Payment'}
              {newStatus === 'overdue' && 'Update Overdue Invoice'}
            </h3>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Invoice #:</span>
                <span className="font-medium">{selectedInvoiceForPayment.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-medium">{formatCurrency(selectedInvoiceForPayment.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Currently Paid:</span>
                <span className="font-medium">{formatCurrency(selectedInvoiceForPayment.amountPaid || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Current Balance:</span>
                <span className="font-medium text-red-600">{formatCurrency(selectedInvoiceForPayment.balance || selectedInvoiceForPayment.total)}</span>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Payment Amount
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                max={selectedInvoiceForPayment.total}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                {newStatus === 'paid' && `Enter the full amount: ${formatCurrency(selectedInvoiceForPayment.total)}`}
                {newStatus === 'partial' && (selectedInvoiceForPayment.amountPaid ?? 0) > 0 && 
                  `Enter total amount paid (current: ${formatCurrency(selectedInvoiceForPayment.amountPaid ?? 0)}). Add new payment to increase total.`}
                {newStatus === 'partial' && (selectedInvoiceForPayment.amountPaid ?? 0) === 0 && 
                  'Enter the total payment amount received so far'}
                {newStatus === 'overdue' && 'Enter total amount paid. The remaining balance will be marked as overdue.'}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentDialog(false);
                  setSelectedInvoiceForPayment(null);
                  setPaymentAmount('');
                  setNewStatus('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePaymentSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Submit Payment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    // </AdminLayout>
  );
}
