"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { SearchFilter } from "@/components/ui/search-filter";
import { Pagination } from "@/components/ui/pagination";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import api from "@/lib/axios";
import { countries } from "@/lib/countries";
import { toast } from "sonner";

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    stateZip: string;
    country?: string;
  };
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    stateZip: string;
    country?: string;
  };
  password: string;
  role: string;
  isActive: boolean;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: "",
    email: "",
    phone: "",
    address: { street: "", city: "", stateZip: "", country: "" },
    password: "",
    role: "customer",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectAcrossPages, setSelectAcrossPages] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [pendingTimer, setPendingTimer] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, pagination.limit, searchQuery]);

  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      fetchUsers();
    }
  }, [filters]);
  // Clear selection when the dataset view changes
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectAcrossPages(false);
  }, [pagination.page, pagination.limit, searchQuery, filters]);




  

const handleExport = () => {
  // Convert users array into a plain array of objects
  const exportData = users.map((user) => ({
    Name: user.name,
    Email: user.email,
    Phone: user.phone,
    Address: user.address.city + ", " + user.address.stateZip + ", " + user.address.country,
    Role: user.role,
    Active: user.isActive ? "Yes" : "No",
    LastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "",
    CreatedAt: new Date(user.createdAt).toLocaleString(),
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

  // Export to Excel
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const data = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(data, `users_${new Date().toISOString().split("T")[0]}.xlsx`);
};



  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filters,
      });

      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await api.get(`/admin/users?${params}`);
      const payload = response.data?.data; // { data: users[], pagination: {...} }
      setUsers(payload?.data || []);
      setPagination((prev) => ({
        ...prev,
        total: payload?.pagination?.total || 0,
        pages: payload?.pagination?.pages || 0,
      }));
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleFilter = useCallback((newFilters: Record<string, any>) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleItemsPerPageChange = (limit: number) => {
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: { street: "", city: "", stateZip: "", country: "" },
      password: "",
      role: "customer",
      isActive: true,
    });
    setFormErrors({});
  };

  const isAllOnPageSelected = useMemo(() => {
    if (!users?.length) return false;
    return users.every((u) => selectedIds.has(u._id));
  }, [users, selectedIds]);

  const toggleSelectOne = (id: string) => {
    if (selectAcrossPages) setSelectAcrossPages(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelectAcrossPages(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      users.forEach((u) => next.add(u._id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const fetchAllUserIds = async (): Promise<string[]> => {
    const ids: string[] = [];
    try {
      let page = 1;
      const limit = 100;
      const base = new URLSearchParams({ ...filters } as any);
      if (searchQuery) base.append("search", searchQuery);
      while (true) {
        const params = new URLSearchParams(base);
        params.set("page", String(page));
        params.set("limit", String(limit));
        const res = await api.get(`/admin/users?${params.toString()}`);
        const payload = res.data?.data;
        const data: User[] = payload?.data || [];
        data.forEach((u) => ids.push(u._id));
        const pages: number = payload?.pagination?.pages || 0;
        if (!pages || page >= pages) break;
        page += 1;
      }
    } catch (err) {
      console.error("Failed to fetch all user ids:", err);
    }
    return ids;
  };

  const executeBulkDelete = async (ids: string[]) => {
    try {
      const resp = await api.post("/admin/users/bulk-delete", { ids });
      const { deleted = [], skipped = [], failed = [] } = resp.data || {};
      if (deleted.length)
        toast.success(`Deleted ${deleted.length} user${deleted.length > 1 ? "s" : ""}.`);
      if (skipped.length)
        toast.warning(`${skipped.length} skipped`, {
          description: "Some users are linked to customers with orders/invoices",
        });
      if (failed.length)
        toast.error(`${failed.length} failed`, {
          description: failed
            .slice(0, 3)
            .map((f: any) => f.error)
            .join("; "),
        });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Bulk delete failed";
      toast.error(msg);
    } finally {
      setIsBulkDeleting(false);
      setSelectedIds(new Set());
      setSelectAcrossPages(false);
      fetchUsers();
    }
  };

  const scheduleBulkDeleteWithUndo = async () => {
    // Determine selected IDs
    let ids: string[] = [];
    if (selectAcrossPages) {
      toast.info("Gathering all users matching current filters…");
      ids = await fetchAllUserIds();
      if (!ids.length) {
        toast.info("No users to delete for current filters");
        return;
      }
    } else {
      ids = Array.from(selectedIds);
      if (ids.length === 0) return;
    }

    setPendingDeleteIds(ids);
    const timer = window.setTimeout(async () => {
      setIsBulkDeleting(true);
      await executeBulkDelete(ids);
      setPendingDeleteIds(null);
      setPendingTimer(null);
    }, 5000);
    setPendingTimer(timer);

    toast.warning(
      `Deleting ${ids.length} user${ids.length > 1 ? "s" : ""} in 5 seconds…`,
      {
        action: {
          label: "Undo",
          onClick: () => {
            if (pendingTimer) window.clearTimeout(pendingTimer);
            setPendingTimer(null);
            setPendingDeleteIds(null);
            toast.info("Deletion canceled");
          },
        },
        duration: 5000,
      }
    );
  };

  const openAddModal = () => {
    resetForm();
    setEditingUser(null);
    setError(null);
    setSuccess(null);
    setShowAddModal(true);
  };

  const openEditModal = (user: User) => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: {
        street: user.address.street || "",
        city: user.address.city || "",
        stateZip: user.address.stateZip || "",
        country: user.address.country || "",
      },
      password: "", // Don't pre-fill password
      role: user.role,
      isActive: user.isActive,
    });
    setEditingUser(user);
    setError(null);
    setSuccess(null);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingUser(null);
    resetForm();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    // Email is optional, but validate format if provided
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else {
      const digits = formData.phone.replace(/\D/g, "");
      if (digits.length < 10) {
        errors.phone = "Phone number must be at least 10 digits";
      }
    }

    // Address is optional - no validation needed

    // Password is optional, but validate length if provided
    if (formData.password && formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      // Compose address - different formats for create vs update
      const addr = formData.address;

      // Normalize phone
      const rawPhone = formData.phone.trim();
      const onlyDigits = rawPhone.replace(/\D/g, "");
      const normalizedPhone = rawPhone.startsWith("+") ? `+${onlyDigits}` : onlyDigits;

      if (editingUser) {
        const updateData: any = {
          name: formData.name,
          phone: normalizedPhone,
          // Update endpoint accepts an address object per backend schema
          address: formData.address,
          role: formData.role,
          isActive: formData.isActive,
        };
        if (formData.password) updateData.password = formData.password;
        await api.put(`/admin/users/${editingUser._id}`, updateData);
      } else {
        // For create, send as comma-separated string: "street, city, stateZip, country"
        const addressLine = [
          addr.street,
          addr.city,
          addr.stateZip,
          addr.country,
        ]
          .filter((s): s is string => Boolean(s))
          .map(s => s.trim())
          .join(", ");

        const submitData = {
          name: formData.name,
          email: formData.email,
          phone: normalizedPhone,
          // Create endpoint expects a single string address
          address: addressLine,
          password: formData.password,
          role: formData.role,
          isActive: formData.isActive,
        };
        await api.post("/admin/users", submitData);
      }

      closeModal();
      fetchUsers();
      
      // Show success message after modal closes
      setSuccess(editingUser ? "User updated successfully" : "User created successfully");
      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (error: any) {
      console.error("Error saving user:", error);
      const resp = error?.response;
      if (resp) {
        const { status, data } = resp;
        // Duplicate email
        if (status === 409 || data?.message?.includes("Email")) {
          setFormErrors({ email: "Email already exists" });
          return;
        }
        // Validation errors from backend
        if (status === 400 && Array.isArray(data?.details)) {
          const nextErrors: Record<string, string> = {};
          for (const d of data.details) {
            const field = String(d.field || "");
            const msg = String(d.message || data?.message || "Invalid value");
            if (field.includes("email")) nextErrors.email = msg;
            else if (field.includes("phone")) nextErrors.phone = msg;
            else if (field.includes("address")) nextErrors.address = msg;
            else if (field.includes("password")) nextErrors.password = msg;
            else if (field.includes("name")) nextErrors.name = msg;
          }
          if (Object.keys(nextErrors).length > 0) {
            setFormErrors(nextErrors);
            return;
          }
        }
      }
      setError("Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      setError("Failed to delete user");
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.put(`/users/${userId}`, { isActive: !currentStatus });
      fetchUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      setError("Failed to update user status");
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "driver":
        return "bg-blue-100 text-blue-800";
      case "customer":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4" />;
      case "driver":
        return <UserIcon className="w-4 h-4" />;
      case "customer":
        return <UserIcon className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filterOptions = {
    role: [
      { value: "admin", label: "Admin" },
      { value: "driver", label: "Driver" },
      { value: "customer", label: "Customer" },
    ],
    status: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  };

  if (loading && users.length === 0) {
    return (
      <AdminLayout>
        <div className="space-y-6 ">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (    
      <div className="space-y-6 px-6 pt-4 ">
        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-600">Manage system users and their roles</p>
          </div>
          <Button onClick={openAddModal}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Bulk selection helpers */}
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-gray-700 flex items-center gap-3 flex-wrap">
            <span>
              Selected: <span className="font-medium">{selectAcrossPages ? pagination.total : selectedIds.size}</span>
            </span>
            {isAllOnPageSelected && !selectAcrossPages && pagination.total > users.length && (
              <button
                className="text-indigo-700 underline underline-offset-2"
                onClick={() => setSelectAcrossPages(true)}
              >
                Select all {pagination.total} results
              </button>
            )}
            {selectAcrossPages && (
              <button
                className="text-indigo-700 underline underline-offset-2"
                onClick={() => setSelectAcrossPages(false)}
              >
                Clear select-across-pages
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={isAllOnPageSelected}
                onChange={() => {
                  if (isAllOnPageSelected) {
                    // unselect page
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      users.forEach((u) => next.delete(u._id));
                      return next;
                    });
                  } else {
                    selectAllOnPage();
                  }
                }}
              />
              Select all on page
            </label>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              disabled={(selectedIds.size === 0 && !selectAcrossPages) || isBulkDeleting || !!pendingDeleteIds}
              onClick={scheduleBulkDeleteWithUndo}
            >
              {pendingDeleteIds ? "Scheduled… (Undo)" : isBulkDeleting ? "Deleting..." : "Delete selected"}
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <SearchFilter
          onSearch={handleSearch}
          onFilter={handleFilter}
          searchPlaceholder="Search users by name, email, or phone..."
          filters={filterOptions}
          showExport={true}
          onExport={handleExport}

        />

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <Card
              key={user._id}
              className="p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-3 mt-1 h-4 w-4"
                    checked={selectedIds.has(user._id)}
                    onChange={() => toggleSelectOne(user._id)}
                  />
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center">
                  <Badge
                    className={`${getRoleColor(
                      user.role
                    )} flex items-center space-x-1`}
                  >
                    {getRoleIcon(user.role)}
                    <span className="capitalize">{user.role}</span>
                  </Badge>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  <span>{user.phone}</span>
                </div>

                <div className="flex items-start text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2 mt-0.5" />
                  <span className="line-clamp-2">{user.address?.city}</span>
                </div>

                {user.lastLogin && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Last login: {formatDate(user.lastLogin)}</span>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(user)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(user._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {users.length === 0 && !loading && (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No users found
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || Object.keys(filters).length > 0
                ? "Try adjusting your search or filters"
                : "Get started by adding your first user"}
            </p>
            <Button onClick={openAddModal}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </Card>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}

        {/* Add/Edit User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingUser ? "Edit User" : "Add New User"}
                  </h2>
                  <Button variant="ghost" onClick={closeModal}>
                    ×
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className={formErrors.name ? "border-red-500" : ""}
                      />
                      {formErrors.name && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className={formErrors.email ? "border-red-500" : ""}
                        placeholder="Email address (optional)"
                      />
                      {formErrors.email && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className={formErrors.phone ? "border-red-500" : ""}
                      />
                      {formErrors.phone && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.phone}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="role">Role *</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, role: value }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="driver">Driver</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {formErrors.role && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.role}</p>
                      )}
                    </div>

                    {/* Address Section */}
                    <div className="md:col-span-2">
                      <div className="rounded-xl border border-gray-200 bg-white">
                        <div className="p-4 space-y-4">
                          <div>
                            <Label htmlFor="street">Street Address</Label>
                            <Input
                              id="street"
                              value={formData.address.street}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  address: { ...prev.address, street: e.target.value },
                                }))
                              }
                              className={formErrors.address ? "border-red-500" : ""}
                              placeholder="Enter street address (optional)"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="city">City</Label>
                              <Input
                                id="city"
                                value={formData.address.city}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    address: { ...prev.address, city: e.target.value },
                                  }))
                                }
                                className={formErrors.address ? "border-red-500" : ""}
                                placeholder="Enter city (optional)"
                              />
                            </div>
                            <div>
                              <Label htmlFor="stateZip">State & ZIP</Label>
                              <Input
                                id="stateZip"
                                value={formData.address.stateZip}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    address: { ...prev.address, stateZip: e.target.value },
                                  }))
                                }
                                className={formErrors.address ? "border-red-500" : ""}
                                placeholder="e.g. CA 90210 (optional)"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="country">Country</Label>
                            <Select
                              value={formData.address.country || ""}
                              onValueChange={(val) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  address: { ...prev.address, country: val },
                                }))
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a country" />
                              </SelectTrigger>
                              <SelectContent className="w-full">
                                {countries.map((c) => (
                                  <SelectItem key={c.value} value={c.value}>
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {formErrors.address && (
                            <p className="text-red-500 text-sm">{formErrors.address}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="password">
                        Password{" "}
                        {editingUser ? "(leave blank to keep current)" : "(optional, default: password123)"}
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          className={formErrors.password ? "border-red-500" : ""}
                          placeholder={editingUser ? "Leave blank to keep current" : "Set password (optional)"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {formErrors.password && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.password}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeModal}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting
                        ? "Saving..."
                        : editingUser
                        ? "Update User"
                        : "Add User"}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}
      </div>
    
  );
}
