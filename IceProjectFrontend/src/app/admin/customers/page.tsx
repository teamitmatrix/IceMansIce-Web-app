"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { SearchFilter } from "@/components/ui/search-filter";
import { Pagination } from "@/components/ui/pagination";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Phone, MapPin, CheckCircle, XCircle, Clock, Edit, Trash2 } from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string | {
    street?: string;
    city?: string;
    state?: string;
  stateZip?: string;
    country?: string;
  };
  isActive: boolean;
  lastOrderDate?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
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
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectAcrossPages, setSelectAcrossPages] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [pendingTimer, setPendingTimer] = useState<number | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, [pagination.page, pagination.limit, searchQuery]);

  // Clear selection when the dataset view changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [pagination.page, pagination.limit, searchQuery, filters]);

  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      fetchCustomers();
    }
  }, [filters]);

  const fetchCustomers = async () => {
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

      const response = await api.get(`/admin/customers?${params}`);
      const payload = response.data?.data;
      setCustomers(payload?.data || []);
      setPagination((prev) => ({
        ...prev,
        total: payload?.pagination?.total || 0,
        pages: payload?.pagination?.pages || 0,
      }));
    } catch (error) {
      console.error("Error fetching customers:", error);
      setError("Failed to load customers");
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
      address: "",
      isActive: true,
    });
    setFormErrors({});
  };

  // Safely format address whether it's a string or an object
  const formatAddressValue = (addr: Customer["address"]): string => {
    if (!addr) return "";
    if (typeof addr === "string") return addr;
    // Handle possible Mongoose subdocument by converting to plain object
    const raw: any = addr as any;
    let plain: any = raw;
    try {
      if (raw && typeof raw.toObject === "function") {
        plain = raw.toObject();
      } else {
        // Fallback: deep clone to strip getters/proxies
        plain = JSON.parse(JSON.stringify(raw));
      }
    } catch {
      plain = raw;
    }
    const pick = (v: any) => (typeof v === "string" ? v : "");
    const street = pick(plain?.street);
    const city = pick(plain?.city);
    const state = pick(plain?.state);
  const stateZip = pick(plain?.stateZip);
    const country = pick(plain?.country);
  return [street, city, stateZip, country].filter(Boolean).join(", ");
  };

  const openAddModal = () => {
    resetForm();
    setEditingCustomer(null);
    setError(null);
    setSuccess(null);
    setShowAddModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: formatAddressValue(customer.address),
      isActive: customer.isActive,
    });
    setEditingCustomer(customer);
    setError(null);
    setSuccess(null);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingCustomer(null);
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
    }

    // Address is optional

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("handleSubmit called", { editingCustomer, formData });

    if (!validateForm()) {
      console.log("Validation failed");
      return;
    }

    try {
      setSubmitting(true);
      console.log("Submitting...");

      if (editingCustomer) {
        console.log("Updating customer:", editingCustomer._id);
        const response = await api.put(`/customers/${editingCustomer._id}`, formData);
        console.log("Update response:", response);
      } else {
        console.log("Creating customer");
        const response = await api.post("/customers", formData);
        console.log("Create response:", response);
      }

      closeModal();
      await fetchCustomers();
      
      // Show success message after modal closes
      setSuccess(editingCustomer ? "Customer updated successfully" : "Customer created successfully");
      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (error: any) {
      console.error("Error saving customer:", error);
      console.error("Error response:", error.response);
      if (error.response?.data?.message?.includes("Email")) {
        setFormErrors({ email: "Email already exists" });
      } else {
        setError(error.response?.data?.message || "Failed to save customer");
      }
    } finally {
      setSubmitting(false);
      console.log("Submitting finished");
    }
  };

  const handleDelete = async (customerId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this customer? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await api.delete(`/customers/${customerId}`);
      fetchCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
      setError("Failed to delete customer");
    }
  };
  
  const toggleSelect = (id: string) => {
    // If selecting/deselecting an individual while across-pages is active,
    // switch back to per-page selection for clarity.
    if (selectAcrossPages) setSelectAcrossPages(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllSelectedOnPage = customers.length > 0 && customers.every(c => selectedIds.has(c._id));

  const toggleSelectAllOnPage = () => {
    // Toggling page select should disable across-pages mode
    setSelectAcrossPages(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllSelectedOnPage) {
        // Unselect all on this page
        customers.forEach(c => next.delete(c._id));
      } else {
        // Select all on this page
        customers.forEach(c => next.add(c._id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const fetchAllCustomerIds = async (): Promise<string[]> => {
    const ids: string[] = [];
    try {
      let page = 1;
      const limit = 100; // fetch in larger pages to reduce requests
      // build base search params mirroring current filters/search
      const base = new URLSearchParams({ ...filters } as any);
      if (searchQuery) base.append("search", searchQuery);
      // loop pages
      while (true) {
        const params = new URLSearchParams(base);
        params.set("page", String(page));
        params.set("limit", String(limit));
        const res = await api.get(`/admin/customers?${params.toString()}`);
        const payload = res.data?.data;
        const data: Customer[] = payload?.data || [];
        data.forEach((c) => ids.push(c._id));
        const pages: number = payload?.pagination?.pages || 0;
        if (!pages || page >= pages) break;
        page += 1;
      }
    } catch (err) {
      console.error("Failed to fetch all customer ids:", err);
    }
    return ids;
  };

  const scheduleDeletionWithUndo = (idsToDelete: string[]) => {
    // Start a 5-second window to undo before executing deletes
    setPendingDeleteIds(idsToDelete);
    const id = window.setTimeout(async () => {
      setBulkDeleting(true);
      try {
        const results = await Promise.allSettled(
          idsToDelete.map((id) => api.delete(`/customers/${id}`))
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          toast.error(`Deleted ${idsToDelete.length - failed}, ${failed} failed.`);
        } else {
          toast.success(`Deleted ${idsToDelete.length} customer${idsToDelete.length > 1 ? "s" : ""}.`);
        }
        clearSelection();
        await fetchCustomers();
      } catch (err) {
        console.error("Bulk delete error:", err);
        toast.error("Failed to delete selected customers");
      } finally {
        setBulkDeleting(false);
        setPendingDeleteIds(null);
        setPendingTimer(null);
      }
    }, 5000);
    setPendingTimer(id);
    toast.warning(
      `Deleting ${idsToDelete.length} customer${idsToDelete.length > 1 ? "s" : ""} in 5 seconds…`,
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

  const handleBulkDelete = async () => {
    // Compute the set of IDs to delete based on current selection mode
    let idsToDelete: string[] = [];
    if (selectAcrossPages) {
      // gather all ids matching current view
      toast.info("Gathering all customers matching current filters…");
      idsToDelete = await fetchAllCustomerIds();
      if (!idsToDelete.length) {
        toast.info("No customers to delete for current filters");
        return;
      }
    } else {
      if (selectedIds.size === 0) return;
      idsToDelete = Array.from(selectedIds);
    }

    scheduleDeletionWithUndo(idsToDelete);
  };

  const toggleCustomerStatus = async (
    customerId: string,
    currentStatus: boolean
  ) => {
    try {
      await api.put(`/customers/${customerId}`, { isActive: !currentStatus });
      fetchCustomers();
    } catch (error) {
      console.error("Error updating customer status:", error);
      setError("Failed to update customer status");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const filterOptions = {
    status: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  };

  if (loading && customers.length === 0) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
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
      <div className="space-y-6 px-6 pt-4">
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
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-600">
              Manage customer information and orders
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <SearchFilter
          onSearch={handleSearch}
          onFilter={handleFilter}
          searchPlaceholder="Search customers by name, email, or phone..."
          filters={filterOptions}
          showExport={true}
          onExport={() => {
            console.log("Export customers");
          }}
        />

        {/* Bulk actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-gray-700 flex items-center gap-3 flex-wrap">
            <span>
              Selected: <span className="font-medium">{selectAcrossPages ? pagination.total : selectedIds.size}</span>
            </span>
            {isAllSelectedOnPage && !selectAcrossPages && pagination.total > customers.length && (
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
                checked={isAllSelectedOnPage}
                onChange={toggleSelectAllOnPage}
              />
              Select all on page
            </label>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              disabled={(selectedIds.size === 0 && !selectAcrossPages) || bulkDeleting || !!pendingDeleteIds}
              onClick={handleBulkDelete}
            >
              {pendingDeleteIds ? "Scheduled… (Undo)" : bulkDeleting ? "Deleting..." : "Delete selected"}
            </Button>
          </div>
        </div>

        {/* Customers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <Card
              key={customer._id}
              className="p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {customer.name}
                    </h3>
                    <p className="text-sm text-gray-600">{customer.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={selectedIds.has(customer._id)}
                    onChange={() => toggleSelect(customer._id)}
                    aria-label={`Select ${customer.name}`}
                  />
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  <span>{customer.phone}</span>
                </div>

                <div className="flex items-start text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2 mt-0.5" />
                  <span className="line-clamp-2">{formatAddressValue(customer.address)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <span>Orders: {customer.totalOrders}</span>
                  </div>
                  <div className="text-green-600 font-medium">
                    {formatCurrency(customer.totalSpent)}
                  </div>
                </div>

                {customer.lastOrderDate && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>
                      Last order: {formatDate(customer.lastOrderDate)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(customer)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(customer._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {customers.length === 0 && !loading && (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No customers found
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || Object.keys(filters).length > 0
                ? "Try adjusting your search or filters"
                : "Customers will appear here once they register"}
            </p>
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

        {/* Edit Customer Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingCustomer ? "Edit Customer" : "Add New Customer"}
                  </h2>
                  <Button variant="ghost" onClick={closeModal} size="sm">
                    ×
                  </Button>
                </div>

                {formErrors.general && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-sm">{formErrors.general}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerName">Name *</Label>
                      <Input
                        id="customerName"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className={formErrors.name ? "border-red-500" : ""}
                        placeholder="Customer name"
                      />
                      {formErrors.name && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="customerEmail">Email</Label>
                      <Input
                        id="customerEmail"
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
                      <Label htmlFor="customerPhone">Phone *</Label>
                      <Input
                        id="customerPhone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className={formErrors.phone ? "border-red-500" : ""}
                        placeholder="Phone number"
                      />
                      {formErrors.phone && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.phone}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="customerAddress">Address</Label>
                      <Input
                        id="customerAddress"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            address: e.target.value,
                          }))
                        }
                        className={formErrors.address ? "border-red-500" : ""}
                        placeholder="Full address (optional)"
                      />
                      {formErrors.address && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeModal}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting
                        ? "Saving..."
                        : editingCustomer
                        ? "Update Customer"
                        : "Create Customer"}
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
