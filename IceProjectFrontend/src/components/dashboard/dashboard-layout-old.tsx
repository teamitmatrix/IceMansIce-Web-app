// "use client";

// import { useState, useEffect } from "react";
// import { useRouter, usePathname } from "next/navigation";
// import Link from "next/link";
// import api from "@/lib/axios";
// import { performLogout } from "@/lib/logout";
// import { Button } from "@/components/ui/button";
// import { 
//   Home, 
//   ShoppingCart, 
//   Clock, 
//   FileText, 
//   CreditCard, 
//   LogOut, 
//   Menu, 
//   X,
//   Bell,
//   User as UserIcon
// } from "lucide-react";

// interface User {
//   id: string;
//   name: string;
//   email: string;
//   phone: string;
//   address: string;
//   role: string;
// }

// interface DashboardLayoutProps {
//   children: React.ReactNode;
// }

// export function DashboardLayout({ children }: DashboardLayoutProps) {
//   const [user, setUser] = useState<User | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
//   const router = useRouter();
//   const pathname = usePathname();

//   // Determine active tab based on current pathname
//   const getActiveTab = (currentPath: string) => {
//     if (currentPath === "/dashboard") return "dashboard";
//     if (currentPath.startsWith("/dashboard/orders")) return "orders";
//     if (currentPath.startsWith("/dashboard/history")) return "history";
//     if (currentPath.startsWith("/dashboard/invoices")) return "invoices";
//     if (currentPath.startsWith("/dashboard/payments")) return "payments";
//     return "dashboard"; // default fallback
//   };

//   const activeTab = getActiveTab(pathname);

//   useEffect(() => {
//     fetchUserProfile();
//   }, []);

//   const fetchUserProfile = async () => {
//     try {
//       const response = await api.get("/auth/me");
//       setUser(response.data.user);
//     } catch (error) {
//       console.error("Failed to fetch user profile:", error);
//       router.push("/login");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLogout = () => performLogout(router);

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
//           <p className="text-gray-600 animate-pulse">Loading your dashboard...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!user || user.role !== "Customer") {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
//         <div className="text-center bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4">
//           <div className="text-6xl mb-4">🚫</div>
//           <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
//           <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
//           <button
//             onClick={() => router.push("/login")}
//             className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
//           >
//             Go to Login
//           </button>
//         </div>
//       </div>
//     );
//   }

//   const navigationItems = [
//     { id: "dashboard", label: "Dashboard", icon: Home, href: "/dashboard", color: "from-blue-500 to-blue-600" },
//     { id: "orders", label: "Place Order", icon: ShoppingCart, href: "/dashboard/orders", color: "from-green-500 to-green-600" },
//     { id: "history", label: "Order History", icon: Clock, href: "/dashboard/history", color: "from-purple-500 to-purple-600" },
//     { id: "invoices", label: "Invoices", icon: FileText, href: "/dashboard/invoices", color: "from-orange-500 to-orange-600" },
//     { id: "payments", label: "Payment Terms", icon: CreditCard, href: "/dashboard/payments", color: "from-pink-500 to-pink-600" },
//   ];

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
//       {/* Mobile Navigation Overlay */}
//       <div 
//         className={`mobile-nav-overlay ${isMobileMenuOpen ? 'open' : ''} md:hidden`}
//         onClick={() => setIsMobileMenuOpen(false)}
//       />

//       {/* Mobile Navigation Sidebar */}
//       <div className={`mobile-nav-sidebar ${isMobileMenuOpen ? 'open' : ''} md:hidden`}>
//         <div className="flex items-center justify-between p-4 border-b border-white/20">
//           <div className="flex items-center">
//             <UserIcon className="w-6 h-6 text-white mr-3" />
//             <div>
//               <h2 className="text-white font-bold">Customer Portal</h2>
//               <p className="text-blue-100 text-sm">{user?.name}</p>
//             </div>
//           </div>
//           <Button 
//             variant="ghost" 
//             size="sm"
//             onClick={() => setIsMobileMenuOpen(false)}
//             className="text-white hover:bg-white/20"
//           >
//             <X className="w-5 h-5" />
//           </Button>
//         </div>
        
//         <nav className="p-4 space-y-2">
//           {navigationItems.map((item) => (
//             <Link
//               key={item.id}
//               href={item.href}
//               onClick={() => setIsMobileMenuOpen(false)}
//               className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 touch-target ${
//                 activeTab === item.id
//                   ? "bg-white/20 text-white shadow-lg"
//                   : "text-blue-100 hover:bg-white/10 hover:text-white"
//               }`}
//             >
//               <item.icon className="w-5 h-5" />
//               <span className="font-medium">{item.label}</span>
//             </Link>
//           ))}
          
//           <div className="pt-4 border-t border-white/20">
//             <button
//               onClick={handleLogout}
//               className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 w-full text-left text-blue-100 hover:bg-white/10 hover:text-white touch-target"
//             >
//               <LogOut className="w-5 h-5" />
//               <span className="font-medium">Logout</span>
//             </button>
//           </div>
//         </nav>
//       </div>

//       {/* Header */}
//       <header className="dashboard-header bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex justify-between items-center h-16">
//             <div className="flex items-center">
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 onClick={() => setIsMobileMenuOpen(true)}
//                 className="md:hidden text-white hover:bg-white/20 mr-3 touch-target"
//               >
//                 <Menu className="w-5 h-5" />
//               </Button>
//               <UserIcon className="w-6 h-6 text-white mr-3" />
//               <div>
//                 <h1 className="text-responsive-lg font-bold text-white">Customer Portal</h1>
//                 <p className="text-blue-100 text-responsive-xs hidden sm:block">Manage your orders and invoices</p>
//               </div>
//             </div>
//             <div className="flex items-center space-x-2 sm:space-x-4">
//               <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 hidden sm:flex touch-target">
//                 <Bell className="w-4 h-4" />
//               </Button>
//               <div className="hidden lg:block text-sm text-blue-100">
//                 Welcome back, <span className="font-semibold text-white">{user?.name}</span>
//               </div>
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 onClick={handleLogout}
//                 className="text-white hover:bg-white/20 touch-target"
//               >
//                 <LogOut className="w-4 h-4" />
//                 <span className="hidden sm:inline ml-2">Logout</span>
//               </Button>
//             </div>
//           </div>
//         </div>
//       </header>

//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="flex flex-col lg:flex-row gap-8">
//           {/* Sidebar Navigation */}
//           <aside className="lg:w-64 flex-shrink-0">
//             <nav className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
//               <div className="space-y-3">
//                 {navigationItems.map((item) => (
//                   <button
//                     key={item.id}
//                     onClick={() => {
//                       router.push(item.href);
//                     }}
//                     className={`w-full group relative overflow-hidden flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${
//                       activeTab === item.id
//                         ? `bg-gradient-to-r ${item.color} text-white shadow-lg transform scale-105`
//                         : "text-gray-700 hover:bg-white/50 hover:shadow-md hover:scale-102"
//                     }`}
//                   >
//                     <item.icon className="w-5 h-5 relative z-10" />
//                     <span className="font-medium relative z-10">{item.label}</span>
//                     {activeTab === item.id && (
//                       <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
//                         <div className="w-2 h-2 bg-white rounded-full animate-bounce-subtle"></div>
//                       </div>
//                     )}
//                   </button>
//                 ))}
//               </div>
//             </nav>

//             {/* User Info Card */}
//             <div className="mt-6 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
//               <div className="flex items-center mb-4">
//                 <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold mr-3">
//                   {user?.name?.charAt(0)?.toUpperCase()}
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-semibold text-gray-900">Account Info</h3>
//                   <p className="text-sm text-gray-500">Customer Portal</p>
//                 </div>
//               </div>
//               <div className="space-y-3 text-sm">
//                 <div className="flex items-center space-x-2">
//                   <span className="text-blue-500">📧</span>
//                   <div>
//                     <span className="text-gray-500">Email:</span>
//                     <p className="font-medium text-gray-900">{user?.email}</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center space-x-2">
//                   <span className="text-green-500">📞</span>
//                   <div>
//                     <span className="text-gray-500">Phone:</span>
//                     <p className="font-medium text-gray-900">{user?.phone}</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center space-x-2">
//                   <span className="text-orange-500">📍</span>
//                   <div>
//                     <span className="text-gray-500">Address:</span>
//                     <p className="font-medium text-gray-900">{user?.address}</p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </aside>

//           {/* Main Content */}
//           <main className="flex-1">
//             <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20 animate-fade-in">
//               {children}
//             </div>
//           </main>
//         </div>
//       </div>
//     </div>
//   );
// }