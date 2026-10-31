"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, CreditCard, Banknote, ExternalLink } from "lucide-react";

interface OrderItem {
  id?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  status: string;
  deliveryType: string;
  specialInstructions?: string;
  createdAt: string;
}

function InvoicePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (!orderId) {
  router.push('/customer/orders');
      return;
    }
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      console.log('Fetching order with ID:', orderId);
      const response = await api.get(`/orders/${orderId}`);
      console.log('API Response:', response.data);
      const orderData = response.data.order || response.data;
      console.log('Order data:', orderData);
      setOrder(orderData);
    } catch (error: any) {
      console.error("Failed to fetch order:", error);
      console.error("Error response:", error.response?.data);
      alert("Failed to load order details. Redirecting to orders page.");
  router.push('/customer/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCashPayment = () => {
    setProcessingPayment(true);
    // Simulate processing
    setTimeout(() => {
      alert("Cash payment recorded! Your order has been confirmed.");
  router.push('/customer/orders');
    }, 1500);
  };

  const handleOnlinePayment = () => {
    // Redirect to external payment link
    window.open('https://pay.icemansice.com', '_blank');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="space-y-4 w-full max-w-md">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <Alert className="max-w-md mx-auto mt-8">
          <AlertDescription>
            Order not found. Please try again.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <div className="text-center pb-6">
          <h2 className="text-3xl font-bold text-gradient-primary mb-2">Invoice</h2>
          <p className="text-gray-600">Order #{order.orderNumber}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2">
            <Card className="card-gradient border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Receipt className="h-6 w-6 text-blue-600" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Order Number</p>
                    <p className="font-semibold">{order.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge variant="outline" className="mt-1">
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Delivery Type</p>
                    <p className="font-semibold">{order.deliveryType || 'Standard Delivery'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Order Date</p>
                    <p className="font-semibold">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {order.specialInstructions && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Special Instructions</p>
                    <p className="bg-gray-50 p-3 rounded-lg text-sm">
                      {order.specialInstructions}
                    </p>
                  </div>
                )}

                <Separator />

                <div>
                  <h4 className="font-semibold mb-4">Order Items</h4>
                  <div className="space-y-3">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-semibold">{item.productName}</p>
                          <p className="text-sm text-gray-600">
                            {item.quantity} × ${item.unitPrice.toFixed(2)}
                          </p>
                        </div>
                        <span className="font-bold text-green-600">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-semibold">${(order.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Tax (0%):</span>
                    <span className="font-semibold">${(order.taxAmount || 0).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-green-600">${(order.total || order.subtotal || 0).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Options */}
          <div>
            <Card className="card-gradient border-none shadow-xl lg:sticky lg:top-6">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-blue-600/10 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-xl">
                  💳 Payment Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center mb-6">
                  <p className="text-2xl font-bold text-green-600 mb-2">
                    ${(order.total || order.subtotal || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Amount Due</p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleCashPayment}
                    disabled={processingPayment}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-none py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                    size="lg"
                  >
                    <Banknote className="h-5 w-5 mr-2" />
                    {processingPayment ? "Processing..." : "Pay with Cash"}
                  </Button>

                  <Button
                    onClick={handleOnlinePayment}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-none py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                    size="lg"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Pay Online
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                <Alert className="bg-blue-50/50 border-blue-200/50 mt-4">
                  <AlertDescription className="text-center text-sm text-gray-600">
                    💡 Online payment will redirect you to our secure payment portal
                  </AlertDescription>
                </Alert>

                <div className="mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/customer/orders')}
                    className="w-full"
                  >
                    Back to Orders
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-gray-500">Loading…</div>}>
      <InvoicePageInner />
    </Suspense>
  )
}