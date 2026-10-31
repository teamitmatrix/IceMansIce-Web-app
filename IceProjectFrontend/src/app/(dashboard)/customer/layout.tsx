// "use client";

// import { useEffect, useState } from "react";
// import { useRouter, usePathname } from "next/navigation";
// import axios from "@/lib/axios";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { User as UserIcon, LogOut, Menu, X, ShoppingCart, FileText, Home, Edit } from "lucide-react";
// import { performLogout } from "@/lib/logout";


// interface User {
//   id: string;
//   name: string;
//   email: string;
//   role: string;
// }

// export default function CustomerLayout({

//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const router = useRouter();
//   const pathname = usePathname();
//   const [user, setUser] = useState<User | null>(null);
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [editing, setEditing] = useState(false);
//   const [form, setForm] = useState({
//     name: "",
//     email: "",
//     phone: "",
//     address: "",
//   });


//   useEffect(() => {
//     // Auth check for customer
//     const token = typeof window !== 'undefined' ? localStorage.getItem("accessToken") : null;
//     const userData = typeof window !== 'undefined' ? localStorage.getItem("user") : null;

//     if (!token || !userData) {
//       router.push("/login");
//       return;
//     }

//     try {
//       const parsedUser = JSON.parse(userData);
//       if (parsedUser.role !== "customer") {
//         router.push("/login");
//         return;
//       }
//       setUser(parsedUser);
//       setForm({
//         name: parsedUser.name || "",
//         email: parsedUser.email || "",
//         phone: parsedUser.phone || "",
//         address: parsedUser.address || "",
//       });
//     } catch {
//       router.push("/login");
//     }
//   }, [router]);

//   const handleLogout = () => performLogout(router);
//   const toggleSidebar = () => setSidebarOpen(!sidebarOpen);


// const handleEditSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!user) return;

//     try {
//       const res = await axios.put(`/customers/${user.id}`, form);

//       if (!res) throw new Error("Failed to update profile");

//       const customer = res.data.customer.user;
//       setUser(customer);

//       localStorage.setItem("user", JSON.stringify(customer));
//       setEditing(false);
//       //  reload page
//       // window.location.reload();

//     } catch (err) {
//       console.error(err);
//       alert("Error updating profile");
//     }
//   };


//   if (!user) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
//         <div className="text-center">
//           <UserIcon className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
//           <p className="text-lg font-medium text-gray-700">Loading Customer Portal...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
//       {/* Mobile menu overlay */}
//       {sidebarOpen && (
//         <div
//           className="fixed inset-0 z-40  bg-opacity-50 lg:hidden"
//           onClick={() => setSidebarOpen(false)}
//         />
//       )}

//       {/* Sidebar */}
//       <div
//         className={`w-full sm:w-auto fixed inset-y-0 left-0 z-50 w-64 transform bg-gradient-to-b from-blue-700 via-blue-800 to-indigo-800 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
//           }`}
//       >
//         <div className="flex h-full flex-col">
//           {/* Header */}
//           <div className="flex h-20 items-center justify-between px-6 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-800 shadow-lg">
//             <div className="flex items-center space-x-3">
//               <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
//                 <UserIcon className="h-6 w-6 text-white" />
//               </div>
//               <div>
//                 <h1 className="text-lg font-bold text-white">Customer Portal</h1>
//                 <p className="text-xs text-blue-200">Account & Orders</p>
//               </div>
//             </div>
//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={toggleSidebar}
//               className="lg:hidden text-white hover:bg-white/20 rounded-full p-2"
//             >
//               <X className="h-4 w-4" />
//             </Button>
//           </div>

//           {/* User info */}
//           <div className="hidden lg:block py-6 px-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700">
//             <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20 shadow-lg">
//               <div className="flex items-center space-x-4">
//                 <div className="h-12 w-12 rounded-full bg-gradient-to-r from-white/30 to-white/20 flex items-center justify-center ring-2 ring-white/40 shadow-md">
//                   <span className="text-white font-bold text-lg">
//                     {user.name?.charAt(0)?.toUpperCase()}
//                   </span>
//                 </div>
//                 <div className="flex-1 min-w-0">
//                   <p className="font-semibold text-white text-base truncate">{user.name}</p>
//                   <p className="text-sm text-blue-200 truncate">{user.email}</p>
//                   <div className="flex items-center mt-2">
//                     <div className="bg-green-400 h-2 w-2 rounded-full mr-2 animate-pulse"></div>
//                     <span className="text-xs text-green-200 font-medium">Online</span>
//                   </div>
//                 </div>
//               </div>
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => setEditing(true)}
//                 className="cursor-pointer mt-4 w-full text-black border-black/30 hover:bg-blue-400"
//               >
//                 <Edit className="h-4 w-4 mr-2" /> Edit Profile
//               </Button>
//             </div>
//           </div>

//           {/* Navigation */}
//           <nav className="flex-1 overflow-y-auto py-4 px-3">
//             {/* profile on mobile  */}

//              <div className="lg:hidden  bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 mb-4">
//             <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20 shadow-lg">
//               <div className="flex items-center space-x-4">
//                 <div className="h-12 w-12 rounded-full bg-gradient-to-r from-white/30 to-white/20 flex items-center justify-center ring-2 ring-white/40 shadow-md">
//                   <span className="text-white font-bold text-lg">
//                     {user.name?.charAt(0)?.toUpperCase()}
//                   </span>
//                 </div>
//                 <div className="flex-1 min-w-0">
//                   <p className="font-semibold text-white text-base truncate">{user.name}</p>
//                   <p className="text-sm text-blue-200 truncate">{user.email}</p>
//                   <div className="flex items-center mt-2">
//                     <div className="bg-green-400 h-2 w-2 rounded-full mr-2 animate-pulse"></div>
//                     <span className="text-xs text-green-200 font-medium">Online</span>
//                   </div>
//                 </div>
//               </div>

//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => setEditing(true)}
//                 className="cursor-pointer mt-4 w-full text-black border-black/30 hover:bg-blue-400"
//               >
//                 <Edit className="h-4 w-4 mr-2" /> Edit Profile
//               </Button>
//             </div>
//           </div>
//             <div className="space-y-2">
//               <Link
//                onClick={toggleSidebar}
//                 href="/customer"
//                 className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${pathname === "/customer"
//                     ? "bg-gradient-to-r from-white/20 to-white/10 text-white shadow-md border border-white/20"
//                     : "text-white/80 hover:bg-white/10 hover:text-white"
//                   }`}
//               >
//                 <Home className="mr-3 h-5 w-5" />
//                 Dashboard
//               </Link>

//               <Link
//               onClick={toggleSidebar}
//                 href="/customer/new-order"
//                 className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${pathname.startsWith("/customer/new-order")
//                     ? "bg-gradient-to-r from-white/20 to-white/10 text-white shadow-md border border-white/20"
//                     : "text-white/80 hover:bg-white/10 hover:text-white"
//                   }`}
//               >
//                 <ShoppingCart className="mr-3 h-5 w-5" />
//                 Place Order
//               </Link>

//               <Link

//                onClick={toggleSidebar}
//                 href={"/customer/orders"}
//                 className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${pathname.startsWith("/customer/orders")
//                     ? "bg-gradient-to-r from-white/20 to-white/10 text-white shadow-md border border-white/20"
//                     : "text-white/80 hover:bg-white/10 hover:text-white"
//                   }`}
//               >
//                 <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
//                 </svg>
//                 Orders
//               </Link>

//               <Link
//               onClick={toggleSidebar}
//                 href="/customer/invoices"
//                 className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${pathname.startsWith("/customer/invoices")
//                     ? "bg-gradient-to-r from-white/20 to-white/10 text-white shadow-md border border-white/20"
//                     : "text-white/80 hover:bg-white/10 hover:text-white"
//                   }`}
//               >
//                 <FileText className="mr-3 h-5 w-5" />
//                 Invoices
//               </Link>

//             </div>
//           </nav>

//           {/* Logout button */}
//           <div className="p-4">
//             <Button
//               onClick={handleLogout}
//               className="cursor-pointer w-full justify-start bg-red-500 hover:bg-red-600 text-white border-none shadow-lg transition-all duration-200"
//             >
//               <LogOut className="h-4 w-4 mr-2" />
//               Logout
//             </Button>
//           </div>
//         </div>
//       </div>

//       {/* Main content */}
//       <div className="lg:pl-64">
//         {/* Mobile top bar */}
//         <div className="sticky top-0 z-40 lg:hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-lg">
//           <div className="flex h-16 items-center gap-x-4 px-4">
//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={toggleSidebar}
//               className="text-white hover:bg-white/20"
//             >
//               <Menu className="h-5 w-5" />
//             </Button>
//             <h1 className="text-lg font-semibold text-white">Customer Portal</h1>
//           </div>
//         </div>

//         {/* Page content */}
//         <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
//           {children}
//         </main>
//          {/* Edit Profile Modal */}
//       {editing && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 mx-3 md:m-0">
//           <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
//             <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>
//             <form onSubmit={handleEditSubmit} className="space-y-4">
//               <input
//                 type="text"
//                 placeholder="Name"
//                 value={form.name}
//                 onChange={(e) => setForm({ ...form, name: e.target.value })}
//                 className="w-full border rounded-lg px-3 py-2"
//               />
//               <input
//                 type="email"
//                 placeholder="Email"
//                 value={form.email}
//                 onChange={(e) => setForm({ ...form, email: e.target.value })}
//                 className="w-full border rounded-lg px-3 py-2"
//               />
//               <input
//                 type="text"
//                 placeholder="Phone"
//                 value={form.phone}
//                 onChange={(e) => setForm({ ...form, phone: e.target.value })}
//                 className="w-full border rounded-lg px-3 py-2"
//               />
//               <input
//                 type="text"
//                 placeholder="Address"
//                 value={form.address}
//                 onChange={(e) => setForm({ ...form, address: e.target.value })}
//                 className="w-full border rounded-lg px-3 py-2"
//               />
//               <div className="cursor-pointer flex justify-end gap-2">
//                 <Button type="button" variant="outline" onClick={() => setEditing(false)}>
//                   Cancel
//                 </Button>
//                 <Button type="submit" className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white">
//                   Save
//                 </Button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//       </div>
//     </div>
//   );
// }


"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import axios from "@/lib/axios";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User as UserIcon, LogOut, Menu, X, ShoppingCart, FileText, Home, Edit } from "lucide-react";
import { performLogout } from "@/lib/logout";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  }
}

export default function CustomerLayout({
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
    address: {
      street: "",
      city: "",
      stateZip: "",
      country: "",
    }
  });

  useEffect(() => {
    // Auth check for customer
    const token = typeof window !== 'undefined' ? localStorage.getItem("accessToken") : null;
    const userData = typeof window !== 'undefined' ? localStorage.getItem("user") : null;

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== "customer") {
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
          country: parsedUser.address.country || ""
        },
      });
    } catch {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => performLogout(router);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  // Generic handler for simple fields
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
      const res = await axios.put(`/customers/${user.id}`, form);

      if (!res) throw new Error("Failed to update profile");

      const customer = res.data.customer.user;
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <UserIcon className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-lg font-medium text-gray-700">Loading Customer Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-gradient-to-b from-blue-700 via-blue-800 to-indigo-800 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-20 items-center justify-between px-6 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-800">
            <div className="flex items-center space-x-3">
              <div className="bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Customer Portal</h1>
                <p className="text-xs text-blue-200">Account & Orders</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="lg:hidden text-white hover:bg-white/10 rounded-full p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User info (desktop) */}
          <div className="hidden lg:block py-6 px-5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700">
            <div className="bg-white/6 rounded-xl p-4 backdrop-blur-sm border border-white/10">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-white/30 to-white/20 flex items-center justify-center ring-2 ring-white/30 shadow-md">
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
                className="cursor-pointer mt-4 w-full text-Black border-white/20 hover:bg-white/6"
              >
                <Edit className="h-4 w-4 mr-2" /> Edit Profile
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-4">
            {/* profile on mobile  */}
            <div className="lg:hidden mb-4">
              <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-xl p-4">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-white/30 to-white/20 flex items-center justify-center ring-2 ring-white/30 shadow-md">
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
                  className="cursor-pointer mt-4 w-full text-black border-white/20 hover:bg-white/6"
                >
                  <Edit className="h-4 w-4 mr-2" /> Edit Profile
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Link
                onClick={toggleSidebar}
                href="/customer"
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${pathname === "/customer"
                  ? "bg-white/10 text-white shadow-md border border-white/10"
                  : "text-white/90 hover:bg-white/6 hover:text-white"
                  }`}
              >
                <Home className="mr-3 h-5 w-5" />
                Dashboard
              </Link>

              <Link
                onClick={toggleSidebar}
                href="/customer/new-order"
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${pathname.startsWith("/customer/new-order")
                  ? "bg-white/10 text-white shadow-md border border-white/10"
                  : "text-white/90 hover:bg-white/6 hover:text-white"
                  }`}
              >
                <ShoppingCart className="mr-3 h-5 w-5" />
                Place Order
              </Link>

              <Link
                onClick={toggleSidebar}
                href={"/customer/orders"}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${pathname.startsWith("/customer/orders")
                  ? "bg-white/10 text-white shadow-md border border-white/10"
                  : "text-white/90 hover:bg-white/6 hover:text-white"
                  }`}
              >
                <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Orders
              </Link>

              <Link
                onClick={toggleSidebar}
                href="/customer/invoices"
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${pathname.startsWith("/customer/invoices")
                  ? "bg-white/10 text-white shadow-md border border-white/10"
                  : "text-white/90 hover:bg-white/6 hover:text-white"
                  }`}
              >
                <FileText className="mr-3 h-5 w-5" />
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
      </aside>

      {/* Main content area */}
      <div className="lg:pl-72 min-h-screen">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-40 lg:hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow">
          <div className="flex h-16 items-center gap-x-4 px-4 justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="text-white hover:bg-white/10"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold text-white">Customer Portal</h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-sm text-white/90 mr-2 hidden sm:block">
                {user.name}
              </div>
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                {user.name?.charAt(0)?.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="min-h-screen py-8">
          {children}
        </main>

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
