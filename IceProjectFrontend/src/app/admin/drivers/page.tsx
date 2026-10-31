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
import { Truck, Phone, MapPin, Clock, Shield } from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";

interface Driver {
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
  isActive: boolean;
  licenseNumber?: string;
  vehicleInfo?: string;
  lastLogin?: string;
  totalDeliveries: number;
  totalEarnings: number;
  createdAt: string;
  updatedAt: string;
}

interface DriverFormData {
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
  licenseNumber: string;
  vehicleInfo: string;
  isActive: boolean;
}

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState<DriverFormData>({
    name: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      stateZip: "",
      country: "",
    },
    password: "",
    licenseNumber: "",
    vehicleInfo: "",
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
    fetchDrivers();
  }, [pagination.page, pagination.limit, searchQuery]);

  // Clear selection when the dataset view changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [pagination.page, pagination.limit, searchQuery, filters]);

  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      fetchDrivers();
    }
  }, [filters]);

  const fetchDrivers = async () => {
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

      const response = await api.get(`/admin/drivers?${params}`);
      const payload = response.data?.data;
      setDrivers(payload?.data || []);
      setPagination((prev) => ({
        ...prev,
        total: payload?.pagination?.total || 0,
        pages: payload?.pagination?.pages || 0,
      }));
    } catch (error) {
      console.error("Error fetching drivers:", error);
      setError("Failed to load drivers");
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
      address: {
        street: "",
        city: "",
        stateZip: "",
        country: "",
      },
      password: "",
      licenseNumber: "",
      vehicleInfo: "",
      isActive: true,
    });
    setFormErrors({});
  };

  const openAddModal = () => {
    resetForm();
    setEditingDriver(null);
    setShowAddModal(true);
  };

  const openEditModal = (driver: Driver) => {
    setFormData({
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      address: {
        street: driver.address.street || "",
        city: driver.address.city || "",
        stateZip: driver.address.stateZip || "",
        country: driver.address.country || "",
      },
      password: "", // Don't pre-fill password
      licenseNumber: driver.licenseNumber || "",
      vehicleInfo: driver.vehicleInfo || "",
      isActive: driver.isActive,
    });
    setEditingDriver(driver);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingDriver(null);
    resetForm();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    }

    // Address validation (multi-field)
    if (!formData.address.street.trim()) {
      errors.address = "Street address is required";
    }
    if (!formData.address.city.trim()) {
      errors.address = (errors.address ? errors.address + "; " : "") + "City is required";
    }
    if (!formData.address.stateZip.trim()) {
      errors.address = (errors.address ? errors.address + "; " : "") + "State & Zip is required";
    }
    // country is optional

    if (!editingDriver && !formData.password.trim()) {
      errors.password = "Password is required";
    }

    if (formData.password && formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (!formData.licenseNumber.trim()) {
      errors.licenseNumber = "License number is required";
    }

    if (!formData.vehicleInfo.trim()) {
      errors.vehicleInfo = "Vehicle information is required";
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

      const submitData = { ...formData, role: "driver" };
      if (editingDriver && !submitData.password) {
        delete (submitData as any).password; // Don't update password if not provided
      }

      if (editingDriver) {
        await api.put(`/users/${editingDriver._id}`, submitData);
      } else {
        await api.post("/auth/register", submitData);
      }

      closeModal();
      fetchDrivers();
    } catch (error: any) {
      console.error("Error saving driver:", error);
      if (error.response?.data?.message?.includes("Email")) {
        setFormErrors({ email: "Email already exists" });
      } else {
        setError("Failed to save driver");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (driverId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this driver? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await api.delete(`/users/${driverId}`);
      fetchDrivers();
    } catch (error) {
      console.error("Error deleting driver:", error);
      setError("Failed to delete driver");
    }
  };

  const toggleSelect = (id: string) => {
    if (selectAcrossPages) setSelectAcrossPages(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllSelectedOnPage = drivers.length > 0 && drivers.every(d => selectedIds.has(d._id));

  const toggleSelectAllOnPage = () => {
    setSelectAcrossPages(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllSelectedOnPage) {
        drivers.forEach(d => next.delete(d._id));
      } else {
        drivers.forEach(d => next.add(d._id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const fetchAllDriverIds = async (): Promise<string[]> => {
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
        const res = await api.get(`/admin/drivers?${params.toString()}`);
        const payload = res.data?.data;
        const data: Driver[] = payload?.data || [];
        data.forEach((d) => ids.push(d._id));
        const pages: number = payload?.pagination?.pages || 0;
        if (!pages || page >= pages) break;
        page += 1;
      }
    } catch (err) {
      console.error("Failed to fetch all driver ids:", err);
    }
    return ids;
  };

  const scheduleDeletionWithUndo = (idsToDelete: string[]) => {
    setPendingDeleteIds(idsToDelete);
    const id = window.setTimeout(async () => {
      setBulkDeleting(true);
      try {
        const results = await Promise.allSettled(
          idsToDelete.map((id) => api.delete(`/users/${id}`))
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          toast.error(`Deleted ${idsToDelete.length - failed}, ${failed} failed.`);
        } else {
          toast.success(`Deleted ${idsToDelete.length} driver${idsToDelete.length > 1 ? "s" : ""}.`);
        }
        clearSelection();
        await fetchDrivers();
      } catch (err) {
        console.error("Bulk delete error:", err);
        toast.error("Failed to delete selected drivers");
      } finally {
        setBulkDeleting(false);
        setPendingDeleteIds(null);
        setPendingTimer(null);
      }
    }, 5000);
    setPendingTimer(id);
    toast.warning(
      `Deleting ${idsToDelete.length} driver${idsToDelete.length > 1 ? "s" : ""} in 5 seconds…`,
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
    let idsToDelete: string[] = [];
    if (selectAcrossPages) {
      toast.info("Gathering all drivers matching current filters…");
      idsToDelete = await fetchAllDriverIds();
      if (!idsToDelete.length) {
        toast.info("No drivers to delete for current filters");
        return;
      }
    } else {
      if (selectedIds.size === 0) return;
      idsToDelete = Array.from(selectedIds);
    }
    scheduleDeletionWithUndo(idsToDelete);
  };
  

  // Status toggle removed from UI per request

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // formatCurrency removed (earnings not shown on driver cards)

  const filterOptions = {
    status: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  };

  if (loading && drivers.length === 0) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
            <p className="text-gray-600">
              Manage driver information and performance
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <SearchFilter
          onSearch={handleSearch}
          onFilter={handleFilter}
          searchPlaceholder="Search drivers by name, email, or phone..."
          filters={filterOptions}
          showExport={true}
          onExport={() => {
            console.log("Export drivers");
          }}
        />

        {/* Bulk actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-gray-700 flex items-center gap-3 flex-wrap">
            <span>
              Selected: <span className="font-medium">{selectAcrossPages ? pagination.total : selectedIds.size}</span>
            </span>
            {isAllSelectedOnPage && !selectAcrossPages && pagination.total > drivers.length && (
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

        {/* Drivers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((driver) => (
            <Card
              key={driver._id}
              className="p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                    {driver.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {driver.name}
                    </h3>
                    <p className="text-sm text-gray-600">{driver.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={selectedIds.has(driver._id)}
                    onChange={() => toggleSelect(driver._id)}
                    aria-label={`Select ${driver.name}`}
                  />
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  <span>{driver.phone}</span>
                </div>

                <div className="flex items-start text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2 mt-0.5" />
                  <span className="line-clamp-2">{driver.address.city}</span>
                </div>

                {driver.licenseNumber && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Shield className="w-4 h-4 mr-2" />
                    <span>License: {driver.licenseNumber}</span>
                  </div>
                )}

                {driver.vehicleInfo && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Truck className="w-4 h-4 mr-2" />
                    <span>{driver.vehicleInfo}</span>
                  </div>
                )}

                {/* Earnings removed per request */}

                {driver.lastLogin && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Last login: {formatDate(driver.lastLogin)}</span>
                  </div>
                )}
              </div>

              {/* Per-item actions removed per request */}
            </Card>
          ))}
        </div>

        {drivers.length === 0 && !loading && (
          <Card className="p-12 text-center">
            <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No drivers found
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || Object.keys(filters).length > 0
                ? "Try adjusting your search or filters"
                : "Drivers will appear here once they are added from the Users page"}
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
      </div>
  );
}
