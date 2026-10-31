"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Truck, LogOut, Menu, X, Edit } from "lucide-react";
import { performLogout } from "@/lib/logout";
import axios from "@/lib/axios";
import { toast } from "sonner";
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address:{
      street: "",
      city: "",
      stateZip: "",
      country: "",
    } 
  });

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("accessToken");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "driver") {
      router.push("/login");
      return;
    }

    setUser(parsedUser);
    setForm({
      name: parsedUser.name || "",
      email: parsedUser.email || "",
      phone: parsedUser.phone || "",
      address: {
        street: parsedUser.address.street || "",
        city: parsedUser.address.city || "",
        stateZip: parsedUser.address.stateZip || "",
        country: parsedUser.address.country || "",
      }
    });

  }, [router]);

  const handleLogout = () => performLogout(router);
// Handler for nested address fields
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [name]: value },
    }));
  };
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };


  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const res = await axios.put(`/driver/${user.id}`, form);

      if (!res) throw new Error("Failed to update profile");

      const driver = res.data;
      setUser(driver);

      localStorage.setItem("user", JSON.stringify(driver));
      toast.success("Profile updated successfully");
      setEditing(false); // Close modal after success
      //  reload page
      // window.location.reload();

    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error updating profile");
    }
  };


  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Truck className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-lg font-medium text-gray-700">Loading Driver Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div
          className="cursor-pointer fixed inset-0 z-40  bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-gradient-to-b from-blue-700 via-blue-800 to-indigo-800 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-20 items-center justify-between px-6 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-800 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Driver Portal</h1>
                <p className="text-xs text-blue-200">Delivery Management</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="cursor-pointer lg:hidden text-white hover:bg-white/20 rounded-full p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Driver info */}
          <div className="hidden lg:block py-6 px-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20 shadow-lg">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-white/30 to-white/20 flex items-center justify-center ring-2 ring-white/40 shadow-md">
                  <span className="text-white font-bold text-lg">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-base truncate">{user.name}</p>
                  <p className="text-sm text-blue-200 truncate">{user.email}</p>
                  <div className="flex items-center mt-2">
                    <div className="bg-green-400 h-2 w-2 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-xs text-green-200 font-medium">Online</span>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                className="cursor-pointer mt-4 w-full text-black border-black/30 hover:bg-blue-400"
              >
                <Edit className="h-4 w-4 mr-2" /> Edit Profile
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">

            {/* driver profile for mobile/tablet */}
            <div className="lg:hidden mb-4  bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700">
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20 shadow-lg">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-white/30 to-white/20 flex items-center justify-center ring-2 ring-white/40 shadow-md">
                    <span className="text-white font-bold text-lg">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-base truncate">{user.name}</p>
                    <p className="text-sm text-blue-200 truncate">{user.email}</p>
                    <div className="flex items-center mt-2">
                      <div className="bg-green-400 h-2 w-2 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-xs text-green-200 font-medium">Online</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="cursor-pointer mt-4 w-full text-black border-black/30 hover:bg-blue-400"
                >
                  <Edit className="h-4 w-4 mr-2" /> Edit Profile
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Link
                onClick={toggleSidebar}
                href="/driver"
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${pathname === '/driver'
                  ? 'bg-gradient-to-r from-white/20 to-white/10 text-white shadow-md border border-white/20'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v14l-5-3-5 3V5z" />
                </svg>
                Dashboard
              </Link>

              <Link
                onClick={toggleSidebar}
                href="/driver/customers"
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${pathname.startsWith('/driver/customers')
                  ? 'bg-gradient-to-r from-white/20 to-white/10 text-white shadow-md border border-white/20'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 01-3 0m3 0h.001M21 12h-6a2 2 0 00-2 2v5a2 2 0 002 2h6a2 2 0 002-2v-5a2 2 0 00-2-2z" />
                </svg>
                Customer Search
              </Link>

              <Link
                onClick={toggleSidebar}
                href="/driver/orders"
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${pathname.startsWith('/driver/orders')
                  ? 'bg-gradient-to-r from-white/20 to-white/10 text-white shadow-md border border-white/20'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Orders
              </Link>

              <Link
                onClick={toggleSidebar}
                href="/driver/invoices"
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${pathname.startsWith('/driver/invoices')
                  ? 'bg-gradient-to-r from-white/20 to-white/10 text-white shadow-md border border-white/20'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Invoices
              </Link>
            </div>
          </nav>

          {/* Logout button */}
          <div className="p-4">
            <Button
              onClick={handleLogout}
              className="cursor-pointer w-full justify-start bg-red-500 hover:bg-red-600 text-white border-none shadow-lg transition-all duration-200"
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
        <div className="sticky top-0 z-40 lg:hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-lg">
          <div className="flex h-16 items-center gap-x-4 px-4 justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="cursor-pointer text-white hover:bg-white/20"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold text-white">Driver Portal</h1>

            </div>
            {/* driver first character profile like image */}
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white">
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
          {children}
        </main>
        {/* modal for editing */}
        {editing && (
          <div className="mx-3 md:mx-0 fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
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
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
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