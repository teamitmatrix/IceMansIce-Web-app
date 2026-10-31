"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign, Calendar, RefreshCcw, Search, Loader2, ExternalLink, ArrowLeft } from "lucide-react";
import axios from "@/lib/axios";

interface InvoiceItem {
  productName?: string;
  name?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  lineTotal?: number;
 
}

interface Invoice {
  id?: string;
  _id?: string;
  invoiceNumber: number;
  customerId?: { name?: string };
  items: InvoiceItem[];
  subtotal?: number;
  taxAmount?: number;
  total: number;
  status: string;
  issueDate?: string;
  createdAt?: string;
  paymentMethod?: string;
  poNumber?: string;
  paymentTerms?: string;
 
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  sent: "bg-purple-100 text-purple-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export default function CustomerInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

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
      const res = await axios.get("/customer-portal/invoices", { params });
      setInvoices(res.data.invoices || res.data?.data || []);
      setPages(res.data.pagination?.pages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const filtered = invoices.filter((inv) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      inv.invoiceNumber?.toString().includes(term) ||
      inv.customerId?.name?.toLowerCase().includes(term) ||
      inv.items?.some((i) => (i.productName || i.name || "").toLowerCase().includes(term))
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

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Invoices</h1>
              <p className="text-gray-600">View invoices for your orders</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { setPage(1); fetchInvoices(); }} className="flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" /> Refresh
              </Button>
              <Button variant="outline" onClick={() => router.push('/customer')} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </Button>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-2 flex items-center gap-2">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by number, item..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Statuses</option>
                {Object.keys(STATUS_COLORS).map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">Total: {invoices.length}</div>
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

      {/* Loading or Empty */}
      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {search || statusFilter
                ? "Try adjusting your filters or search term."
                : "Invoices will appear here once they’re generated for your orders."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((inv) => (
            <Card key={inv._id || inv.id} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{inv.invoiceNumber}</h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(inv.issueDate || inv.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center flex-wrap gap-2 text-sm text-gray-600">
                      <span>{inv.items?.length || 0} item{(inv.items?.length || 0) !== 1 && "s"}</span>
                      {inv.paymentMethod && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{inv.paymentMethod}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-600">{formatCurrency(inv.total)}</span>
                      </div>
                      {/* show status */}
                      <Badge className={STATUS_COLORS[inv.status] || "bg-gray-100 text-gray-800"}>{inv.status}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/customer/invoices/${inv._id || inv.id}`)}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const payUrl = new URL("https://pay.icemansice.com");
                        payUrl.searchParams.set("invoiceId", String(inv._id || inv.id));
                        payUrl.searchParams.set("amount", String(inv.total));
                        window.open(payUrl.toString(), "_blank");
                      }}
                      className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                      <ExternalLink className="h-4 w-4" /> Pay
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
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-gray-600">Page {page} of {pages}</span>
          <Button variant="outline" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
