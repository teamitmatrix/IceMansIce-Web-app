"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign, Calendar, ArrowLeft, RefreshCcw, Search, Loader2, ExternalLink, Eye } from "lucide-react";
import axios from "@/lib/axios";
import { toast } from "sonner";

interface InvoiceItem {
  productName?: string;
  name?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

interface Invoice {
  id?: string;
  _id?: string;
  invoiceNumber: number;
  salesOrderId?: any;
  customerId: {
    name: string;
    email?: string;
    phone?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  taxAmount?: number;
  total: number;
  amountPaid?: number;
  balance?: number;
  status: string;
  issueDate?: string;
  createdAt?: string;
  paymentMethod?: string;
  poNumber?: string;
  paymentTerms?: string;
  notes?: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  sent: "bg-purple-100 text-purple-800",
  partial: "bg-orange-100 text-orange-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export default function DriverInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError("");
      const params: any = { page, limit: 25 };
      if (statusFilter) params.status = statusFilter;
      const res = await axios.get("/driver/invoices", { params });
      setInvoices(res.data.invoices || []);
      setPages(res.data.pagination?.pages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const filtered = invoices.filter(inv => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      inv.invoiceNumber.toString().includes(term) ||
      inv.customerId?.name?.toLowerCase().includes(term) ||
      inv.items?.some(i => (i.productName || i.name || '').toLowerCase().includes(term))
    );
  });

  const formatCurrency = (amount: number | undefined) => {
    if (amount == null) return "$0.00";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  const formatDate = (date?: string) => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const handleStatusChange = async (invoice: Invoice, status: string) => {
    // If status is already the same as current AND it's a payment status, show dialog to add more payment
    if ((status === 'paid' || status === 'partial' || status === 'overdue') && invoice.status === status) {
      // Same status selected - show dialog to update payment amount
      openPaymentDialog(invoice, status);
      return;
    }

    // If changing to paid, partial, or overdue, show payment dialog
    if (status === 'paid' || status === 'partial' || status === 'overdue') {
      openPaymentDialog(invoice, status);
    } else {
      // For other statuses (draft, pending, approved, sent, cancelled), update without payment dialog
      try {
        await axios.put(`/driver/invoices/${invoice._id || invoice.id}`, { status });
        toast.success(`Invoice status updated to ${status}`);
        fetchInvoices();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to update status");
      }
    }
  };

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
      await axios.put(`/driver/invoices/${selectedInvoiceForPayment._id || selectedInvoiceForPayment.id}`, {
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

  const getStatusBadgeColor = (status: string) => {
    return STATUS_COLORS[status.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Invoices</h1>
              <p className="text-sm sm:text-base text-gray-600">Driver-generated invoices and those tied to your orders</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => { setPage(1); fetchInvoices(); }} className="flex items-center gap-2 flex-1 sm:flex-initial" size="sm">
                <RefreshCcw className="h-4 w-4" /> <span className="hidden xs:inline">Refresh</span>
              </Button>
              <Button variant="outline" onClick={() => router.push('/driver')} className="flex items-center gap-2 flex-1 sm:flex-initial" size="sm">
                <ArrowLeft className="h-4 w-4" /> <span className="hidden xs:inline">Dashboard</span>
              </Button>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 flex items-center gap-2">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by number, customer, item..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Statuses</option>
                {Object.keys(STATUS_COLORS).map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs sm:text-sm text-gray-600">Total: {invoices.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-600 max-w-md mx-auto">{search || statusFilter ? 'Try adjusting your filters or search term.' : 'Invoices will appear here once you generate them from approved orders.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(inv => (
            <Card key={inv._id || inv.id} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">#{inv.invoiceNumber}</h3>
                          <select
                            value={inv.status}
                            onChange={(e) => handleStatusChange(inv, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full border-0 font-medium ${getStatusBadgeColor(inv.status)}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {Object.keys(STATUS_COLORS).map(s => (
                              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3 flex-shrink-0" /> {formatDate(inv.issueDate || inv.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center flex-wrap gap-2 text-xs sm:text-sm text-gray-600">
                      <span className="font-medium text-gray-900 truncate">{inv.customerId?.name || 'Unknown Customer'}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">{inv.items?.length || 0} item{(inv.items?.length || 0) !== 1 && 's'}</span>
                      {inv.paymentMethod && <><span className="hidden sm:inline">•</span><span className="capitalize hidden sm:inline">{inv.paymentMethod}</span></>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                        <span className="font-semibold text-green-600">{formatCurrency(inv.total)}</span>
                      </div>
                      {inv.amountPaid !== undefined && inv.amountPaid > 0 && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="text-xs text-gray-600">
                            Paid: {formatCurrency(inv.amountPaid)}
                          </span>
                        </>
                      )}
                      {inv.balance !== undefined && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className={`text-xs font-medium ${inv.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            Bal: {formatCurrency(inv.balance)}
                          </span>
                        </>
                      )}
                      {/* Status chip hidden as requested */}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* Show Add Payment button for partial/overdue invoices with remaining balance */}
                    {(inv.status === 'partial' || inv.status === 'overdue') && (inv.balance ?? 0) > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openPaymentDialog(inv, inv.status)}
                        className="flex items-center gap-1 border-green-500 text-green-600 hover:bg-green-50"
                      >
                        <span>+ Partial Amount</span>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => router.push(`/driver/invoices/${inv._id || inv.id}`)} className="flex-1 sm:flex-initial">
                      <Eye className="h-4 w-4 mr-1 sm:mr-2" />
                      View
                    </Button>
                    <Button size="sm" onClick={() => {
                      const payUrl = new URL('https://pay.icemansice.com');
                      payUrl.searchParams.set('invoiceId', String(inv._id || inv.id));
                      payUrl.searchParams.set('amount', String(inv.total));
                      window.open(payUrl.toString(), '_blank');
                    }} className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 flex-1 sm:flex-initial">
                      <ExternalLink className="h-4 w-4" /> 
                      <span className="hidden xs:inline">Pay</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2 sm:gap-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          <span className="text-xs sm:text-sm text-gray-600">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next</Button>
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
  );
}
