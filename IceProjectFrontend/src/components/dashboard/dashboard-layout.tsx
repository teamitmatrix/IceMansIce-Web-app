"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";
import { performLogout } from "@/lib/logout";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  ShoppingCart, 
  Clock, 
  FileText, 
  CreditCard, 
  LogOut, 
  Menu, 
  X,
  Bell,
  User as UserIcon
} from "lucide-react";

interface User {
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
  role: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Determine active tab based on current pathname (customer portal)
  const getActiveTab = () => {
    if (pathname === "/customer") return "dashboard";
    if (pathname.startsWith("/customer/new-order")) return "orders";
    if (pathname.startsWith("/customer/orders")) return "history";
    if (pathname.startsWith("/customer/invoices")) return "invoices";
    return "dashboard";
  };

  const activeTab = getActiveTab();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data.user);
    } catch (error) {
      console.error("Error fetching user data:", error);
      // If token is invalid, redirect to login
      localStorage.removeItem("token");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => performLogout(router);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <p className="text-gray-600">Unable to load user data. Redirecting...</p>
        </div>
      </div>
    );
  }

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: Home, href: "/customer", color: "from-blue-500 to-blue-600" },
    { id: "orders", label: "Place Order", icon: ShoppingCart, href: "/customer/new-order", color: "from-green-500 to-green-600" },
    { id: "history", label: "Order History", icon: Clock, href: "/customer/orders", color: "from-purple-500 to-purple-600" },
    { id: "invoices", label: "Invoices", icon: FileText, href: "/customer/invoices", color: "from-orange-500 to-orange-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Mobile Navigation Overlay */}
      <div 
        className={`mobile-nav-overlay ${isMobileMenuOpen ? 'open' : ''} md:hidden`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Navigation Sidebar */}
      <div className={`mobile-nav-sidebar ${isMobileMenuOpen ? 'open' : ''} md:hidden`}>
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <div className="flex items-center">
            <UserIcon className="w-6 h-6 text-white mr-3" />
            <div>
              <h2 className="text-white font-bold">Customer Portal</h2>
              <p className="text-blue-100 text-sm">{user.name}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 touch-target ${
                activeTab === item.id
                  ? "bg-white/20 text-white shadow-lg"
                  : "text-blue-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
          
          <div className="pt-4 border-t border-white/20">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleLogout();
              }}
              className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 w-full text-left text-blue-100 hover:bg-white/10 hover:text-white touch-target"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Header */}
      <header className="dashboard-header bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
        <div className="container-responsive">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden text-white hover:bg-white/20 mr-3 touch-target"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <UserIcon className="w-6 h-6 text-white mr-3" />
              <div>
                <h1 className="text-responsive-lg font-bold text-white">Customer Portal</h1>
                <p className="text-blue-100 text-responsive-xs hidden sm:block">Manage your orders and invoices</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 hidden sm:flex touch-target">
                <Bell className="w-4 h-4" />
              </Button>
              <div className="hidden lg:block text-sm text-blue-100">
                Welcome back, <span className="font-semibold text-white">{user.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  handleLogout();
                }}
                className="text-white hover:bg-white/20 touch-target"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30">
        <div className="container-responsive">
          <div className="flex space-x-1 py-2">
            {navigationItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 hover-lift ${
                  activeTab === item.id
                    ? `bg-gradient-to-r ${item.color} text-white shadow-lg transform scale-105`
                    : "text-gray-700 hover:bg-white/50 hover:shadow-md"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="font-medium">{item.label}</span>
                {activeTab === item.id && (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container-responsive py-4 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
          {/* Mobile Account Info Card */}
          <div className="md:hidden bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-semibold text-gray-900">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.role}</p>
              </div>
              
              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-gray-500 mb-1">Email</label>
                  <p className="font-medium text-gray-900">{user.email}</p>
                </div>
                
                <div>
                  <label className="block text-gray-500 mb-1">Phone</label>
                  <p className="font-medium text-gray-900">{user.phone}</p>
                </div>
                
                <div>
                  <label className="block text-gray-500 mb-1">Address</label>
                  <p className="font-medium text-gray-900">{user.address.city}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}