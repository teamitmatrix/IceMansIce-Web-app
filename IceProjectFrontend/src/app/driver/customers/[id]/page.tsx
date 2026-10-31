"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  User, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign,
  FileText,
  CreditCard,
  Plus,
  Calendar
} from "lucide-react";
import axios from "@/lib/axios";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  // Removed credit/balance/terms from UI model
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  orderDate: string;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  receivedAt: string;
  status: string;
}

export default function CustomerDetails() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
    }
  }, [customerId]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/driver/customers/${customerId}`);
      
      setCustomer(response.data.customer);
      setRecentOrders(response.data.recentOrders || []);
      setPaymentHistory(response.data.paymentHistory || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load customer details");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = () => {
    router.push(`/driver/orders/new?customerId=${customerId}`);
  };

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
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Payment terms display removed

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      draft: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      processing: "bg-purple-100 text-purple-800",
      shipped: "bg-indigo-100 text-indigo-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <User className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-lg font-medium text-gray-700">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-800 font-medium">Error loading customer</p>
          <p className="text-red-600 mt-2">{error || "Customer not found"}</p>
          <div className="flex space-x-4 mt-4">
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
            <Button onClick={fetchCustomerDetails}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button 
          onClick={() => router.back()} 
          variant="outline" 
          size="sm"
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg p-6 flex-1">
          <h1 className="text-2xl font-bold mb-2">Customer Details</h1>
          <p className="text-blue-100">View customer information and manage orders</p>
        </div>
      </div>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <span>{customer.name}</span>
            </CardTitle>
            {/* Removed active status badge */}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 border-b pb-2">Contact Information</h3>
              
              {customer.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-900">{customer.email}</span>
                </div>
              )}

              {customer.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-900">{customer.phone}</span>
                </div>
              )}

              {customer.address && (
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-gray-600 mt-1" />
                  <div className="text-gray-900">
                    {customer.address.street && <div>{customer.address.street}</div>}
                    <div>
                      {[
                        customer.address.city,
                        customer.address.state,
                        customer.address.zipCode
                      ].filter(Boolean).join(", ")}
                    </div>
                    {customer.address.country && <div>{customer.address.country}</div>}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="text-gray-900">
                  Customer since {formatDate(customer.createdAt)}
                </span>
              </div>
            </div>

            {/* Account Info removed per requirements */}
          </div>

          {/* Action Button */}
          <div className="mt-6 pt-6 border-t">
            <Button 
              onClick={handleCreateOrder}
              className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Order for {customer.name}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Recent Orders</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-sm text-gray-600">{formatDate(order.orderDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(order.total)}</p>
                      {/* Status chip hidden as requested */}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent orders</p>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              <span>Payment History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentHistory.length > 0 ? (
              <div className="space-y-3">
                {paymentHistory.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {payment.method.replace("_", " ").toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-600">{formatDateTime(payment.receivedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(payment.amount)}</p>
                      {/* Status chip hidden as requested */}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No payment history</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}