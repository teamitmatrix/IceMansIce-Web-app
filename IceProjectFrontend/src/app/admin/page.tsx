"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Package,
  ShoppingCart,
  FileText,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Shield,
  ExternalLink,
} from "lucide-react";
import api from "@/lib/axios";

interface DashboardStats {
  today: {
    sales: number;
    orders: number;
  };
  thisMonth: {
    sales: number;
    orders: number;
    growth: {
      sales: number;
      orders: number;
    };
  };
  totals: {
    customers: number;
    products: number;
    drivers: number;
    orders: number;
  };
  last30Days?: {
    customers: number;
    products: number;
    orders: number;
    revenue: number;
  };
  alerts: {
    pendingOrders: number;
    overdueInvoices: number;
  };
  lastUpdated: string | Date;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentOrders();
    fetchTopProducts();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/dashboard/stats");
      setStats(response.data.data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setError("Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const response = await api.get("/admin/orders", {
        params: { page: 1, limit: 5, sortBy: "orderDate", sortOrder: "desc" },
      });
      setRecentOrders(response.data.data?.data || []);
    } catch (err) {
      console.error("Error fetching recent orders:", err);
    }
  };

  const fetchTopProducts = async () => {
    try {
      // Aggregate top products client-side from orders in the last 90 days
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 90);
      const params = {
        page: 1,
        limit: 200,
        dateFrom: start.toISOString(),
        dateTo: end.toISOString(),
      } as const;
      const response = await api.get("/admin/orders", { params });
      const orders: any[] = response.data?.data?.data || [];

      const counts: Record<string, { productName: string; sku?: string; quantitySold: number }> = {};
      for (const order of orders) {
        const items: any[] = order.items || [];
        for (const it of items) {
          const key = (it.productId || it.sku || it.productName || it.name || "unknown").toString();
          const name = it.productName || it.name || "Unknown Product";
          const sku = it.sku;
          const qty = Number(it.quantity) || 0;
          if (!counts[key]) {
            counts[key] = { productName: name, sku, quantitySold: 0 };
          }
          counts[key].quantitySold += qty;
          if (!counts[key].sku && sku) counts[key].sku = sku;
        }
      }

      const aggregated = Object.values(counts)
        .sort((a, b) => b.quantitySold - a.quantitySold)
        .slice(0, 5);
      setTopProducts(aggregated);
    } catch (err) {
      console.error("Error aggregating top products:", err);
      setTopProducts([]);
    }
  };

  const exportData = async () => {
    try {
      const response = await api.get("/admin/export?type=orders&format=csv", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "orders_export.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardStats}>Try Again</Button>
        </div>
      </AdminLayout>
    );
  }

  // Use last 30 days values for cards per requirement
  const totalCustomers = stats?.last30Days?.customers ?? 0;
  const totalProducts = stats?.last30Days?.products ?? 0;
  const totalOrders = stats?.last30Days?.orders ?? 0;
  const totalRevenue = stats?.last30Days?.revenue ?? 0;

  const statCards = [
    {
      title: "Total Customers",
      value: totalCustomers,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      change: "+12%",
      changeType: "positive" as const,
    },
    {
      title: "Products",
      value: totalProducts,
      icon: Package,
      color: "from-green-500 to-green-600",
      change: "+5%",
      changeType: "positive" as const,
    },
    {
      title: "Total Orders",
      value: totalOrders,
      icon: ShoppingCart,
      color: "from-purple-500 to-purple-600",
      change: "+18%",
      changeType: "positive" as const,
    },
    {
      title: "Total Revenue",
      value: `$${(totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "from-orange-500 to-orange-600",
      change: "+23%",
      changeType: "positive" as const,
    },
  ];

  // Removed Pending Orders and Overdue Invoices alert cards per request

  return (
      <div className="space-y-6 px-6">
        {/* Dashboard Header */}
        <div className="mb-8 pt-4 md:pt-2">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-gray-600 mt-1">
                  Welcome back! Here's what's happening with your business.
                </p>
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
                <div className="h-12 w-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const getCardStyle = (color: string) => {
              switch (color) {
                case "from-blue-500 to-blue-600":
                  return "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200";
                case "from-green-500 to-green-600":
                  return "bg-gradient-to-br from-green-50 to-green-100 border-green-200";
                case "from-purple-500 to-purple-600":
                  return "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200";
                case "from-orange-500 to-orange-600":
                  return "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200";
                default:
                  return "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200";
              }
            };

            return (
              <Card key={index} className={getCardStyle(stat.color)}>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {stat.value}
                      </p>
                      <div className="flex items-center mt-2">
                        <span
                          className={`text-sm font-medium ${
                            stat.changeType === "positive"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {stat.change}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">
                          from last month
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}
                    >
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Alerts removed */}

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Orders
              </h3>
              <Link href="/admin/orders">
                <Button asChild={false} variant="outline" size="sm">View All</Button>
              </Link>
            </div>
            <div className="space-y-3">
              {recentOrders.length > 0 ? (
                recentOrders.map((order: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {order.orderNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.customerId?.name || "Unknown"}
                      </p>
                    </div>
                    <div className="text-right">
                      {(!order.total || order.total === 0) ? <p className="font-medium text-gray-500">N/A</p> : <p className="font-medium text-green-600">{`$${Number(order.total).toFixed(2)}`}</p>}
                      {/* Status hidden per request */}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">No recent orders found</div>
              )}
            </div>
          </Card>

          {/* Top Products */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Top Products
              </h3>
              <Link href="/admin/products">
                <Button asChild={false} variant="outline" size="sm">View All</Button>
              </Link>
            </div>
            <div className="space-y-3">
              {topProducts.length > 0 ? (
                topProducts.map((product: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {product.productName || product.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        SKU: {product.sku || "N/A"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {typeof product.quantitySold === "number" ? product.quantitySold : product.quantity}
                      </p>
                      <p className="text-sm text-gray-600">sold</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">No product data available</div>
              )}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
              <Button
                className="h-20 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                onClick={() =>
                  (window.location.href = "/admin/users/add-admin")
                }
              >
                <div className="text-center">
                  <Users className="h-6 w-6 mx-auto mb-1" />
                  <span className="text-sm">Add Admin</span>
                </div>
              </Button>
              <Button
                className="h-20 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                onClick={() => (window.location.href = "/admin/products/new")}
              >
                <div className="text-center">
                  <Package className="h-6 w-6 mx-auto mb-1" />
                  <span className="text-sm">Add Product</span>
                </div>
              </Button>
              <Button
                className="h-20 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
                onClick={() => (window.location.href = "/admin/orders")}
              >
                <div className="text-center">
                  <ShoppingCart className="h-6 w-6 mx-auto mb-1" />
                  <span className="text-sm">View Orders</span>
                </div>
              </Button>
              <Button
                className="h-20 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                onClick={() => (window.location.href = "/admin/quickbooks")}
              >
                <div className="text-center">
                  <ExternalLink className="h-6 w-6 mx-auto mb-1" />
                  <span className="text-sm">QuickBooks</span>
                </div>
              </Button>
              {/* Reports quick action removed */}
            </div>
          </div>
        </Card>
      </div>
  );
}
