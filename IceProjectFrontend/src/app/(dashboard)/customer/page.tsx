// "use client";

// import { useEffect, useState } from "react";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { FileText, Receipt, ShoppingBag } from "lucide-react";
// import axios from "@/lib/axios";

// interface DashboardStats {
//   ordersToday: number;
//   invoicesToday: number;
//   amountInvoicedToday: number;
// }

// export default function CustomerDashboard() {
//   const [stats, setStats] = useState<DashboardStats | null>(null);
//   const [recentOrders, setRecentOrders] = useState<any[]>([]);
//   const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     fetchDashboardData();
//   }, []);

//   const fetchDashboardData = async () => {
//     try {
//       setLoading(true);
//       const response = await axios.get("/customer-portal/dashboard");
//       console.log(response);
//       setStats(response.data.stats);
//       setRecentOrders(response.data.recentOrders || []);
//       setRecentInvoices(response.data.recentInvoices || []);
//     } catch (err: any) {
//       setError(err.response?.data?.message || "Failed to load dashboard data");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const formatCurrency = (amount: number) =>
//     new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-96">
//         <div className="text-center">
//           <ShoppingBag className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
//           <p className="text-lg font-medium text-gray-700">Loading dashboard...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="text-center py-12">
//         <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
//           <p className="text-red-800 font-medium">Error loading dashboard</p>
//           <p className="text-red-600 mt-2">{error}</p>
//           <Button onClick={fetchDashboardData} className="mt-4" variant="outline">
//             Retry
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
//       {/* Header */}
//       <div className="mb-8">
//         <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
//           <div className="flex items-center justify-between">
//             <div>
//               <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
//                 Customer Dashboard
//               </h1>
//               <p className="text-gray-600 mt-1">View your recent activity and quick shortcuts</p>
//             </div>
//             <div className="hidden sm:flex items-center space-x-4">
//               <div className="text-right">
//                 <p className="text-sm text-gray-500">Current Time</p>
//                 <p className="font-semibold text-gray-900">
//                   {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Stats Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

//         {/* Orders Today */}
//         <Card className="relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-200 bg-gradient-to-br from-emerald-500 to-green-600 text-white">
//           <CardHeader className="pb-2">
//             <div className="flex items-center justify-between">
//               <CardTitle className="text-sm font-medium opacity-90">Orders Today</CardTitle>
//               <div className="p-2 rounded-full bg-white/20">
//                 <FileText className="h-4 w-4" />
//               </div>
//             </div>
//           </CardHeader>
//           <CardContent>
//             <div className="text-3xl font-bold">{stats?.ordersToday || 0}</div>
//             <p className="text-xs opacity-90 mt-1">+12% vs yesterday</p>
//           </CardContent>
//         </Card>

//         {/* Invoices Today */}
//         <Card className="relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-200 bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
//           <CardHeader className="pb-2">
//             <div className="flex items-center justify-between">
//               <CardTitle className="text-sm font-medium opacity-90">Invoices Today</CardTitle>
//               <div className="p-2 rounded-full bg-white/20">
//                 <Receipt className="h-4 w-4" />
//               </div>
//             </div>
//           </CardHeader>
//           <CardContent>
//             <div className="text-3xl font-bold">{stats?.invoicesToday || 0}</div>
//             <p className="text-xs opacity-90 mt-1">+8% vs last week</p>
//           </CardContent>
//         </Card>

//         {/* Amount Invoiced */}
//         <Card className="relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-200 bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
//           <CardHeader className="pb-2">
//             <div className="flex items-center justify-between">
//               <CardTitle className="text-sm font-medium opacity-90">Amount Invoiced</CardTitle>
//               <div className="p-2 rounded-full bg-white/20">
//                 <Receipt className="h-4 w-4" />
//               </div>
//             </div>
//           </CardHeader>
//           <CardContent>
//             <div className="text-3xl font-bold">
//               {formatCurrency(stats?.amountInvoicedToday || 0)}
//             </div>
//             <p className="text-xs opacity-90 mt-1">This month’s trend ↑</p>
//           </CardContent>
//         </Card>

//       </div>

//       {/* Recent Activity */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center space-x-2">
//               <FileText className="h-5 w-5 text-blue-600" />
//               <span>Recent Orders</span>
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             {recentOrders.length > 0 ? (
//               <div className="space-y-3">
//                 {recentOrders.map((order) => (
//                   <div key={order.id || order._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
//                     <div>
//                       <p className="font-medium text-gray-900">{order.orderNumber}</p>
//                       <p className="text-xs text-gray-500">{new Date(order.orderDate).toLocaleDateString()}</p>
//                     </div>
//                     <div className="text-right">
//                       <p className="font-semibold text-green-600">{formatCurrency(order.total)}</p>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <p className="text-gray-500 text-center py-4">No recent orders</p>
//             )}
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center space-x-2">
//               <Receipt className="h-5 w-5 text-blue-600" />
//               <span>Recent Invoices</span>
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             {recentInvoices.length > 0 ? (
//               <div className="space-y-3">
//                 {recentInvoices.map((inv) => (
//                   <div key={inv.id || inv._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
//                     <div>
//                       <p className="font-medium text-gray-900">{inv.invoiceNumber}</p>
//                       <p className="text-xs text-gray-500">{new Date(inv.issueDate || inv.createdAt).toLocaleDateString()}</p>
//                     </div>
//                     <div className="text-right">
//                       <p className="font-semibold text-purple-700">{formatCurrency(inv.total)}</p>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <p className="text-gray-500 text-center py-4">No recent invoices</p>
//             )}
//           </CardContent>
//         </Card>
//       </div>

//       {/* Quick Actions */}
//       <Card className="mt-6">
//         <CardHeader>
//           <CardTitle>Quick Actions</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//             <Button className="cursor-pointer h-20 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600" onClick={() => (window.location.href = "/customer/new-order")}>
//               <div className="text-center">
//                 <FileText className="h-6 w-6 mx-auto mb-1" />
//                 <span className="text-sm">New Order</span>
//               </div>
//             </Button>
//             <Button className="cursor-pointer h-20 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600" onClick={() => (window.location.href = "/customer/orders")}>
//               <div className="text-center">
//                 <FileText className="h-6 w-6 mx-auto mb-1" />
//                 <span className="text-sm">Orders</span>
//               </div>
//             </Button>
//             <Button className="cursor-pointer h-20 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600" onClick={() => (window.location.href = "/customer/invoices")}>
//               <div className="text-center">
//                 <Receipt className="h-6 w-6 mx-auto mb-1" />
//                 <span className="text-sm">Invoices</span>
//               </div>
//             </Button>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }


"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, ShoppingBag } from "lucide-react";
import axios from "@/lib/axios";

interface DashboardStats {
  ordersToday: number;
  invoicesToday: number;
  amountInvoicedToday: number;
}

export default function CustomerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/customer-portal/dashboard");
      console.log(response);
      setStats(response.data.stats);
      setRecentOrders(response.data.recentOrders || []);
      setRecentInvoices(response.data.recentInvoices || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <ShoppingBag className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
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
          <Button onClick={fetchDashboardData} className="mt-4" variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Customer Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">View your recent activity and quick shortcuts</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <p className="text-xs text-gray-500">Current Time</p>
                <p className="font-semibold text-gray-900">
                  {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <Button
                className="hidden cursor-pointer sm:inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md hover:opacity-95"
                onClick={() => (window.location.href = "/customer/new-order")}
              >
                <FileText className="h-4 w-4" />
                New Order
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Orders Today */}
        <Card className="relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 bg-gradient-to-br from-emerald-600 to-green-600 text-white border border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold opacity-95">Orders Today</CardTitle>
              <div className="p-2 rounded-full bg-white/18">
                <FileText className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold leading-tight">
                  {stats?.ordersToday || 0}
                </div>
                <p className="text-xs text-white/80 mt-1">Compared to yesterday</p>
              </div>

              {/* small sparkline (purely visual)
              <div className="hidden sm:block ml-4">
                <svg width="80" height="36" viewBox="0 0 80 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M2 28 L18 20 L34 14 L50 10 L66 8 L78 6" stroke="white" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div> */}
            </div>
          </CardContent>
        </Card>

        {/* Invoices Today */}
        <Card className="relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 bg-gradient-to-br from-sky-600 to-cyan-600 text-white border border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold opacity-95">Invoices Today</CardTitle>
              <div className="p-2 rounded-full bg-white/18">
                <Receipt className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold leading-tight">
                  {stats?.invoicesToday || 0}
                </div>
                <p className="text-xs text-white/80 mt-1">Last 7 days trend</p>
              </div>

              {/* <div className="hidden sm:block ml-4">
                <svg width="80" height="36" viewBox="0 0 80 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M2 26 L18 18 L34 20 L50 12 L66 14 L78 10" stroke="white" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div> */}
            </div>
          </CardContent>
        </Card>

        {/* Amount Invoiced */}
        <Card className="relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 bg-gradient-to-br from-violet-600 to-indigo-600 text-white border border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold opacity-95">Amount Invoiced</CardTitle>
              <div className="p-2 rounded-full bg-white/18">
                <Receipt className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold leading-tight">
                  {formatCurrency(stats?.amountInvoicedToday || 0)}
                </div>
                <p className="text-xs text-white/80 mt-1">This month</p>
              </div>

              {/* <div className="hidden sm:block ml-4">
                <svg width="80" height="36" viewBox="0 0 80 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M2 24 L18 16 L34 12 L50 14 L66 6 L78 8" stroke="white" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div> */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="rounded-2xl shadow-sm border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-900">
              <FileText className="h-5 w-5 text-indigo-600" />
              <span>Recent Orders</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id || order._id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{new Date(order.orderDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-600">{formatCurrency(order.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No recent orders</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-900">
              <Receipt className="h-5 w-5 text-indigo-600" />
              <span>Recent Invoices</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentInvoices.length > 0 ? (
              <div className="space-y-3">
                {recentInvoices.map((inv) => (
                  <div
                    key={inv.id || inv._id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{inv.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">{new Date(inv.issueDate || inv.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-violet-600">{formatCurrency(inv.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No recent invoices</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6 rounded-2xl shadow-sm border">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              className="cursor-pointer h-20 flex flex-col items-center justify-center rounded-lg shadow-sm bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
              onClick={() => (window.location.href = "/customer/new-order")}
            >
              <FileText className="h-6 w-6 mb-1" />
              <span className="text-sm">New Order</span>
            </Button>

            <Button
              className="cursor-pointer h-20 flex flex-col items-center justify-center rounded-lg shadow-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              onClick={() => (window.location.href = "/customer/orders")}
            >
              <FileText className="h-6 w-6 mb-1" />
              <span className="text-sm">Orders</span>
            </Button>

            <Button
              className="cursor-pointer h-20 flex flex-col items-center justify-center rounded-lg shadow-sm bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white"
              onClick={() => (window.location.href = "/customer/invoices")}
            >
              <Receipt className="h-6 w-6 mb-1" />
              <span className="text-sm">Invoices</span>
            </Button>

            {/* placeholder for future action - keeps grid consistent */}
            <div className="h-20 flex items-center justify-center rounded-lg border-dashed border-2 border-gray-200 text-sm text-gray-400">
              More
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
