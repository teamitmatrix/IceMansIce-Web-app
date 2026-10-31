"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";
import { performLogout } from "@/lib/logout";
import { Button } from "@/components/ui/button";
import {
  Home,
  Users,
  Package,
  ShoppingCart,
  FileText,
  UserPlus,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Shield,
  Download,
  Search,
  ExternalLink,
  Truck,
  Edit,
} from "lucide-react";
import axios from "axios";
import { Toaster, toast } from "sonner";

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

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      stateZip: "",
      country: "",
    }
  });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handler for nested address fields
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [name]: value },
    }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const res = await api.put(`/admin/users/${user.id}`, form);

      if (!res) throw new Error("Failed to update profile");

      const customer = res.data.user;
      setUser(customer);
      
      localStorage.setItem("user", JSON.stringify(customer));
      toast.success("Profile updated successfully");
      setEditing(false); // Close modal after success
      //  reload page
      // window.location.reload();

    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error updating profile");
    }
  };

  // Determine active tab based on current pathname
  const getActiveTab = () => {
    if (pathname === "/admin") return "dashboard";
    if (pathname.startsWith("/admin/users")) return "users";
    if (pathname.startsWith("/admin/products")) return "products";
    if (pathname.startsWith("/admin/orders")) return "orders";
    if (pathname.startsWith("/admin/invoices")) return "invoices";
    if (pathname.startsWith("/admin/customers")) return "customers";
    if (pathname.startsWith("/admin/drivers")) return "drivers";
    if (pathname.startsWith("/admin/quickbooks")) return "quickbooks";
    if (pathname.startsWith("/admin/settings")) return "settings";
    
  // reports removed
    return "dashboard";
  };

  // Get page title for mobile header
  const getPageTitle = () => {
    if (pathname === "/admin") return "Dashboard";
    if (pathname.startsWith("/admin/users/add-admin")) return "Admin";
    if (pathname.startsWith("/admin/users")) return "Users";
    if (pathname.startsWith("/admin/products")) return "Products";
    if (pathname.startsWith("/admin/orders")) return "Orders";
    if (pathname.startsWith("/admin/invoices")) return "Invoices";
    if (pathname.startsWith("/admin/customers")) return "Customers";
    if (pathname.startsWith("/admin/drivers")) return "Drivers";
    if (pathname.startsWith("/admin/quickbooks")) return "QuickBooks";
    if (pathname.startsWith("/admin/settings")) return "Settings";
    
  // reports removed
    return "Admin Portal";
  };

  const activeTab = getActiveTab();

  useEffect(() => {
    fetchUserData();
    const userData = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    const parsedUser = JSON.parse(userData || "{}");
    if (parsedUser.role !== "admin") {
      router.push("/login");
      return;
    }
    setUser(parsedUser);
    setForm({
      name: parsedUser.name || "",
      email: parsedUser.email || "",
      phone: parsedUser.phone || "",
      address: {
        street: parsedUser.address?.street || "",
        city: parsedUser.address?.city || "",
        stateZip: parsedUser.address?.stateZip || "",
        country: parsedUser.address?.country || ""
      },
    });
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get("/auth/me");
      if (response.data.user.role !== "admin") {
        const role = (response.data.user.role || "").toLowerCase();
        if (role === "driver") router.push("/driver");
        else if (role === "customer") router.push("/customer");
        else router.push("/login");
        return;
      }
      setUser(response.data.user);
    } catch (error) {
      console.error("Error fetching user data:", error);
      localStorage.removeItem("token");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => performLogout(router);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Admin Portal...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <p className="text-gray-600">Access denied. Redirecting...</p>
        </div>
      </div>
    );
  }

  const navigationItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      href: "/admin",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      id: "users",
      label: "Users",
      icon: Users,
      href: "/admin/users",
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "products",
      label: "Products",
      icon: Package,
      href: "/admin/products",
      color: "from-green-500 to-green-600",
    },
    {
      id: "orders",
      label: "Orders",
      icon: ShoppingCart,
      href: "/admin/orders",
      color: "from-purple-500 to-purple-600",
    },
    {
      id: "invoices",
      label: "Invoices",
      icon: FileText,
      href: "/admin/invoices",
      color: "from-orange-500 to-orange-600",
    },
    {
      id: "customers",
      label: "Customers",
      icon: Users,
      href: "/admin/customers",
      color: "from-pink-500 to-pink-600",
    },
    {
      id: "drivers",
      label: "Drivers",
      icon: Truck,
      href: "/admin/drivers",
      color: "from-teal-500 to-teal-600",
    },
    {
      id: "quickbooks",
      label: "QuickBooks",
      icon: ExternalLink,
      href: "/admin/quickbooks",
      color: "from-emerald-500 to-emerald-600",
    },
    {
      id: "settings",
      label: "Site Settings",
      icon: Settings,
      href: "/admin/settings",
      color: "from-gray-500 to-gray-600",
    },
    {
      id: "admin",
      label: "Add Admin",
      icon: Shield,
      href: "/admin/users/add-admin",
      color: "from-teal-500 to-teal-600",
    },
    
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40  bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-gradient-to-b from-indigo-700 via-indigo-800 to-purple-800 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileMenuOpen
          ? "translate-x-0"
          : "-translate-x-full lg:translate-x-0"
          }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-20 items-center justify-between px-6 bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Admin Portal</h1>
                <p className="text-xs text-indigo-200">Business Management</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden text-white hover:bg-white/20 rounded-full p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Admin info */}
          <div className="hidden lg:block p-6 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20 shadow-lg">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-white/30 to-white/20 flex items-center justify-center ring-2 ring-white/40 shadow-md">
                  <span className="text-white font-bold text-lg">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-base truncate">
                    {user.name}
                  </p>
                  <p className="text-sm text-indigo-200 truncate">
                    {user.email}
                  </p>
                  <div className="flex items-center mt-2">
                    <div className="bg-green-400 h-2 w-2 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-xs text-green-200 font-medium">
                      Administrator
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                className="cursor-pointer mt-4 w-full text-black border-white/20 hover:bg-white/6"
              >
                <Edit className="h-4 w-4 mr-2" /> Edit Profile
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 [scrollbar-width:none] ">

            {/* Admin info on small screens */}
            <div className="lg:hidden p-2 rounded-xl mb-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700">
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20 shadow-lg">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-white/30 to-white/20 flex items-center justify-center ring-2 ring-white/40 shadow-md">
                    <span className="text-white font-bold text-lg">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-base truncate">
                      {user.name}
                    </p>
                    <p className="text-sm text-indigo-200 truncate">
                      {user.email}
                    </p>
                    <div className="flex items-center mt-2">
                      <div className="bg-green-400 h-2 w-2 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-xs text-green-200 font-medium">
                        Administrator
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="cursor-pointer mt-4 w-full text-black border-white/20 hover:bg-white/6"
                >
                  <Edit className="h-4 w-4 mr-2" /> Edit Profile
                </Button>
              </div>
            </div>


            <div className="space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === item.id
                    ? "bg-gradient-to-r from-white/20 to-white/10 text-white shadow-md border border-white/20"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Logout button */}
          <div className="p-4">
            <Button
              onClick={handleLogout}
              className="w-full justify-start bg-red-500 hover:bg-red-600 text-white border-none shadow-lg transition-all duration-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-40 lg:hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 shadow-lg">
          <div className="flex h-16 items-center justify-between gap-x-4 px-4">
            <div className="flex">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(true)}
                className="text-white hover:bg-white/20"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold text-white">
                {getPageTitle()}
              </h1>
            </div>

            <div className="h-8 w-8 rounded-full bg-white/30 flex items-center justify-center text-white">
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main >
          <div >{children}</div>
        </main>

        {/* Toasts */}
        <Toaster position="top-right" richColors />

        {/* Edit Profile Modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                {/* Name */}
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />

                {/* Email */}
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />

                {/* Phone */}
                <input
                  type="text"
                  name="phone"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />

                {/* Address Fields */}
                <div className="flex flex-wrap gap-4">
                  <input
                    type="text"
                    name="street"
                    placeholder="Street"
                    value={form.address.street}
                    onChange={handleAddressChange}
                    className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <input
                    type="text"
                    name="city"
                    placeholder="City"
                    value={form.address.city}
                    onChange={handleAddressChange}
                    className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <input
                    type="text"
                    name="stateZip"
                    placeholder="State & ZIP"
                    value={form.address.stateZip}
                    onChange={handleAddressChange}
                    className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <input
                    type="text"
                    name="country"
                    placeholder="Country"
                    value={form.address.country}
                    onChange={handleAddressChange}
                    className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Save
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
