"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import api from "@/lib/axios";

interface InvoiceItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
}

interface Invoice {
  _id: string;
  id?: string;
  invoiceNumber: number;
  customerId: string;
  salesOrderId?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: string;
  dueDate: string;
  issueDate: string;
  paymentTerms: string;
  poNumber?: string;
  notes?: string;
  paymentStatus: string;
  daysOverdue: number;
  createdAt: string;
  updatedAt: string;
}

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  sent: "bg-purple-100 text-purple-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const statusLabels = {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchInvoices();
  }, [currentPage, statusFilter, dateFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: 10,
      };

      if (statusFilter) params.status = statusFilter;
      if (dateFilter) {
        const date = new Date(dateFilter);
        params.dateFrom = date.toISOString().split('T')[0];
      }

      const response = await api.get("/invoices", { params });
      
      setInvoices(response.data.invoices || []);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoiceNumber.toString().includes(searchLower) ||
      invoice.items.some(item => 
        item.name.toLowerCase().includes(searchLower) ||
        item.sku.toLowerCase().includes(searchLower)
      )
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPaymentStatus = (invoice: Invoice) => {
    if (invoice.status === "paid" || invoice.balance <= 0) return "paid";
    if (invoice.daysOverdue > 0) return "overdue";
    return "pending";
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "text-green-600";
      case "overdue": return "text-red-600";
      default: return "text-yellow-600";
    }
  };

  const handlePayNow = (invoice: Invoice) => {
    // This will redirect to the payment system
    const paymentUrl = `https://pay.icemansice.com/invoice/${invoice.id}`;
    window.open(paymentUrl, '_blank');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
          <p className="text-gray-600 mt-1">View and pay your invoices</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📄</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Total Outstanding</h3>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(invoices.reduce((sum, inv) => sum + inv.balance, 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">⚠️</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Overdue</h3>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(invoices.filter(inv => inv.daysOverdue > 0).reduce((sum, inv) => sum + inv.balance, 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">✓</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Paid This Month</h3>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(invoices.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + inv.total, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Invoices
              </label>
              <input
                type="text"
                placeholder="Invoice number, product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                {Object.entries(statusLabels).map(([status, label]) => (
                  <option key={status} value={status}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter("");
                  setDateFilter("");
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm || statusFilter || dateFilter ? "No invoices match your filters" : "No invoices found"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issue Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance Due
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {invoice.items.length} item{invoice.items.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(invoice.issueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(invoice.dueDate)}
                        {invoice.daysOverdue > 0 && (
                          <div className="text-xs text-red-600">
                            {invoice.daysOverdue} days overdue
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {statusLabels[invoice.status as keyof typeof statusLabels]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getPaymentStatusColor(getPaymentStatus(invoice))}`}>
                          {formatCurrency(invoice.balance)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {invoice.balance > 0 ? "Outstanding" : "Paid in full"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        {invoice.balance > 0 && (
                          <button
                            onClick={() => handlePayNow(invoice)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Pay Now
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Invoice Details Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Invoice Details - {selectedInvoice.invoiceNumber}
                    </h3>
                    <p className="text-gray-600">
                      Issued on {formatDate(selectedInvoice.issueDate)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Invoice Information</h4>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Status:</dt>
                        <dd className="capitalize">{statusLabels[selectedInvoice.status as keyof typeof statusLabels]}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Issue Date:</dt>
                        <dd>{formatDate(selectedInvoice.issueDate)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Due Date:</dt>
                        <dd>
                          {formatDate(selectedInvoice.dueDate)}
                          {selectedInvoice.daysOverdue > 0 && (
                            <span className="text-red-600 ml-2">({selectedInvoice.daysOverdue} days overdue)</span>
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Payment Terms:</dt>
                        <dd className="capitalize">{selectedInvoice.paymentTerms.replace('net', 'Net ')}</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Payment Information</h4>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Total Amount:</dt>
                        <dd className="font-medium">{formatCurrency(selectedInvoice.total)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Amount Paid:</dt>
                        <dd>{formatCurrency(selectedInvoice.amountPaid)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Balance Due:</dt>
                        <dd className={`font-medium ${selectedInvoice.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(selectedInvoice.balance)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                    <p className="text-sm text-gray-600">{selectedInvoice.notes}</p>
                  </div>
                )}

                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Invoice Items</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Discount</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tax</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedInvoice.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right text-sm text-gray-900">{item.quantity}</td>
                            <td className="px-4 py-2 text-right text-sm text-gray-900">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-4 py-2 text-right text-sm text-gray-900">{formatCurrency(item.discount)}</td>
                            <td className="px-4 py-2 text-right text-sm text-gray-900">{(item.taxRate * 100).toFixed(1)}%</td>
                            <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">{formatCurrency(item.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                    </div>
                    {selectedInvoice.discountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Discount:</span>
                        <span>-{formatCurrency(selectedInvoice.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedInvoice.total)}</span>
                    </div>
                    {selectedInvoice.amountPaid > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Amount Paid:</span>
                        <span>-{formatCurrency(selectedInvoice.amountPaid)}</span>
                      </div>
                    )}
                    <div className={`flex justify-between text-lg font-bold border-t border-gray-200 pt-2 ${selectedInvoice.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      <span>Balance Due:</span>
                      <span>{formatCurrency(selectedInvoice.balance)}</span>
                    </div>
                  </div>

                  {selectedInvoice.balance > 0 && (
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => handlePayNow(selectedInvoice)}
                        className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
                      >
                        Pay Now - {formatCurrency(selectedInvoice.balance)}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}