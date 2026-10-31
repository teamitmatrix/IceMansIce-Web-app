"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Truck, 
  DollarSign, 
  FileText, 
  Users, 
  TrendingUp
} from "lucide-react";
import axios from "@/lib/axios";

interface DashboardStats {
  ordersToday: number;
  paymentsToday: number;
  totalCollectedToday: number;
}

// Session interface removed (session feature deprecated)

export default function DriverDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/driver/dashboard");
      
      setStats(response.data.stats);
  setRecentOrders(response.data.recentOrders || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Session management removed

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Removed time helpers for session & payments lists

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Truck className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-lg font-medium text-gray-700">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-800 font-medium">Error loading dashboard</p>
          <p className="text-red-600 mt-2">{error}</p>
          <Button 
            onClick={fetchDashboardData} 
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
      {/* Dashboard Header */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Driver Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Manage your deliveries and track your performance</p>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Current Time</p>
                <p className="font-semibold text-gray-900">
                  {new Date().toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <Truck className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
      {/* Session Status removed */}

      {/* Stats Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 bg-gradient-to-br from-emerald-600 to-green-600 text-white border border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold opacity-95">
                Orders Today
              </CardTitle>
              <div className="p-2 rounded-full bg-white/18">
              <FileText className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-extrabold leading-tight">
              {stats?.ordersToday || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 bg-gradient-to-br from-sky-600 to-cyan-600 text-white border border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold opacity-95">
                Payments Today
              </CardTitle>
              <div className="p-2 rounded-full bg-white/18">
              <DollarSign className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-extrabold leading-tight">
              {stats?.paymentsToday || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 bg-gradient-to-br from-violet-600 to-indigo-600 text-white border border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold opacity-95">
                Total Collected
              </CardTitle>
              <div className="p-2 rounded-full bg-white/18">
              <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-extrabold leading-tight">
              {formatCurrency(stats?.totalCollectedToday || 0)}
            </div>
          </CardContent>
        </Card>

        {/* Pending Invoices card removed */}
      </div>

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
                {recentOrders.slice(0, 5).map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-sm text-gray-600">{order.customerId?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(order.total)}</p>
                      <p className="text-xs text-gray-500">{new Date(order.orderDate).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent orders</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments section removed */}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              className="cursor-pointer h-20 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              onClick={() => window.location.href = "/driver/customers"}
            >
              <div className="text-center">
                <Users className="h-6 w-6 mx-auto mb-1" />
                <span className="text-sm">Find Customer</span>
              </div>
            </Button>
            <Button 
              className="cursor-pointer h-20 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              onClick={() => window.location.href = "/driver/customers"}
            >
              <div className="text-center">
                <FileText className="h-6 w-6 mx-auto mb-1" />
                <span className="text-sm">New Order</span>
              </div>
            </Button>
            <Button 
              className="cursor-pointer h-20 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              onClick={() => window.location.href = "/driver/orders"}
            >
              <div className="text-center">
                <FileText className="h-6 w-6 mx-auto mb-1" />
                <span className="text-sm">Orders</span>
              </div>
            </Button>
            <Button 
              className="cursor-pointer h-20 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
              onClick={() => window.location.href = "/driver/invoices"}
            >
              <div className="text-center">
                <FileText className="h-6 w-6 mx-auto mb-1" />
                <span className="text-sm">Invoices</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}