"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  FileText, 
  DollarSign,
  Calendar,
  User,
  Eye,
  Printer,
  RefreshCcw,
  ArrowLeft
} from "lucide-react";
import OrderSummaryStats from '@/components/orders/OrderSummaryStats';
import axios from "@/lib/axios";
import api from "@/lib/axios";
import OrderUpdateModal from "@/components/admin/updateOrder";
import { toast } from "sonner";

interface Order {
  id: string;
  orderNumber: string;
  customerId?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  total: number;
  orderDate: string;
  paymentMethod: string;
  isPaidOnDelivery: boolean;
  isPaidOnline?: boolean;
}

export default function OrdersList() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  // status removed from payload & UI
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
  const params: any = { page, limit: 25 };
      const response = await axios.get("/driver/orders", { params });
      setOrders(response.data.orders || []);
      setPages(response.data.pagination?.pages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(term) ||
      o.customerId?.name?.toLowerCase().includes(term)
    );
  });

  const handleCreateOrder = () => {
    router.push("/driver/customers");
  };

  const handleViewOrder = (orderId: string) => {
    router.push(`/driver/orders/${orderId}`);
  };
  const handleGenerateInvoice = async (order: any) => {
   try {
    console.log("Generating invoice for order:", order);
    
    // Prepare invoice data with orderId, poNumber, and paymentTerms from the order
    const invoicePayload = {
      orderId: order._id || order.id,
      poNumber: order.poNumber || undefined,
      paymentTerms: order.paymentTerms || "immediate",
      paymentMethod: order.paymentMethod || undefined,
    };
    
    console.log("Invoice payload:", invoicePayload);
    
    const response = await api.post('/driver/invoices', invoicePayload);
    console.log("Invoice response:", response);
    
    if (!response.data.invoice) {
      toast.error("Failed to generate invoice");
      return;
    }
    
    const invoiceId = response.data.invoice._id || response.data.invoice.id;
    toast.success("Invoice generated successfully");
    router.push(`/driver/invoices/${invoiceId}`);
    
   } catch (error: any) {
     console.error("Error generating invoice:", error);
     const errorMessage = error.response?.data?.message || error.message || "Failed to generate invoice";
     toast.error(errorMessage);
   }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // removed status color helper

  const getPaymentMethodDisplay = (method: string) => {
    const methods: { [key: string]: string } = {
      cash: "Cash",
      online: "Online",
      check: "Check",
      charged: "Charged",
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-lg font-medium text-gray-700">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Orders Management
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">View and manage customer orders</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => { setPage(1); fetchOrders(); }} className="flex items-center gap-2 flex-1 sm:flex-initial" size="sm">
                <RefreshCcw className="h-4 w-4" /> <span className="hidden xs:inline">Refresh</span>
              </Button>
              <Button variant="outline" onClick={() => router.push('/driver')} className="flex items-center gap-2 flex-1 sm:flex-initial" size="sm">
                <ArrowLeft className="h-4 w-4" /> <span className="hidden xs:inline">Dashboard</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">

      {/* Quick Stats moved above filters */}
      {filteredOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderSummaryStats orders={orders} />
          </CardContent>
        </Card>
      )}

      {/* Filters (status removed) */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-4">
        <div className="flex-1">
          <input
            placeholder="Search orders or customers..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setSearch(""); setPage(1); fetchOrders(); }} className="flex-1 sm:flex-initial" size="sm">Reset</Button>
          <Button onClick={handleCreateOrder} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 flex-1 sm:flex-initial" size="sm">
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">New Order</span>
            <span className="xs:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-medium">Error loading orders</p>
          <p className="text-red-600 mt-2">{error}</p>
          <Button onClick={fetchOrders} className="mt-4" variant="outline">
            Retry
          </Button>
        </div>
      )}

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="flex-1 space-y-3 w-full">
                    {/* Order Header */}
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{order.orderNumber}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 flex items-center space-x-1">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{formatDate(order.orderDate)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="font-medium text-gray-900 truncate">{order.customerId?.name || "Unknown customer"}</span>
                      {order.customerId?.phone && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline truncate">{order.customerId.phone}</span>
                        </>
                      )}
                    </div>

                    {/* Order Details */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                        <span className="font-semibold text-green-600">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                      
                      {/* Status removed */}

                      <Badge variant="outline" className="text-xs">
                        {getPaymentMethodDisplay(order.paymentMethod)}
                      </Badge>

                      {order.isPaidOnDelivery && (
                        <Badge className="bg-orange-100 text-orange-800 text-xs" variant="secondary">
                          COD
                        </Badge>
                      )}
                      {order.isPaidOnline && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs" variant="secondary">
                          Online
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col gap-2 w-full sm:w-auto sm:ml-4">
                    <Button
                      onClick={() => handleViewOrder(order.id)}
                      variant="outline"
                      size="sm"
                      className="flex items-center justify-center gap-2 flex-1 sm:flex-initial sm:min-w-[120px]"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View</span>
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setSelectedOrder(order)} className="flex-1 sm:flex-initial sm:min-w-[120px]">
                      Edit
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleGenerateInvoice(order)} className="flex-1 sm:flex-initial sm:min-w-[120px] text-xs">
                      <span className="hidden sm:inline">Generate Invoice</span>
                      <span className="sm:hidden">Invoice</span>
                    </Button>
                    
                    {false && order /* invoice action conditioned on status removed */}
                    
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
           {selectedOrder && (
                    <OrderUpdateModal
                      order={selectedOrder}
                      onClose={() => setSelectedOrder(null)}
                      onUpdated={fetchOrders}
                      path="/driver/order/"
                    />
                  )}
        </div>

        
      ) : (
        /* Empty State */
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-6">
              You haven't created any orders yet. Start by searching for a customer and creating a new order.
            </p>
            <div className="flex justify-center space-x-4">
              <Button 
                onClick={() => router.push("/driver/customers")}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <User className="h-4 w-4" />
                <span>Find Customer</span>
              </Button>
              <Button 
                onClick={handleCreateOrder}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <Plus className="h-4 w-4" />
                <span>Create Order</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-gray-600">Page {page} of {pages}</span>
          <Button variant="outline" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
    </div>
  );
}