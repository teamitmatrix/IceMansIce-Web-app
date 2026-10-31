"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { EnhancedDataTable } from "@/components/ui/enhanced-data-table";
import { FormModal, FormField, FormSection } from "@/components/ui/form-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Select removed from form usage
import { Select } from "@radix-ui/react-select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { exportData, commonColumns } from "@/lib/export-utils";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import api from "@/lib/axios";

interface Product {
  _id: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  quantity: number;
  tax: number;
  unit: string;
  isActive: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface ProductFormData {
  name: string;
  price: number;
  quantity: number;
  // tax stored in form as percentage (0-100)
  tax: number;
}

export default function AdminProducts() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    price: 0,
    quantity: 0,
    tax: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [pagination.page, pagination.limit, filters, searchQuery]);

  const fetchProducts = async () => {
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

      const response = await api.get(`/admin/products?${params}`);
      const payload = response.data?.data;
      setProducts(payload?.data || []);
      setPagination((prev) => ({
        ...prev,
        total: payload?.pagination?.total || 0,
        pages: payload?.pagination?.pages || 0,
      }));
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleNewProduct = () => {
    router.push('/admin/products/new');
  }
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilter = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      price: 0,
      quantity: 0,
      tax: 0,
    });
    setFormErrors({});
  };

  const openAddModal = () => {
    resetForm();
    setEditingProduct(null);
    setShowAddModal(true);
  };

  const openEditModal = (product: Product) => {
    setFormData({
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      // Convert stored decimal (0-1) to percentage (0-100) for UI
      tax: typeof product.tax === "number" ? product.tax * 100 : 0,
    });
    setEditingProduct(product);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingProduct(null);
    resetForm();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Product name is required";
    }

    if (formData.price < 0) {
      errors.price = "Price must be greater than 0";
    }

    if (formData.quantity < 0) {
      errors.quantity = "Quantity cannot be negative";
    }


    // formData.tax is percent in UI
    if (formData.tax < 0 || formData.tax > 100) {
      errors.tax = "Tax must be between 0 and 100";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      addToast({
        type: "error",
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Build payload per backend schema.
      const submitData: any = {
        name: formData.name.trim(),
        price: formData.price,
        quantity: formData.quantity,
        // Convert percent (0-100) back to decimal (0-1) for API
        tax: (Number.isFinite(formData.tax) ? formData.tax : 0) / 100,
      };

      // For creates, backend requires SKU. Auto-generate from name.
      if (!editingProduct) {
        const base = formData.name
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        submitData.sku = `${base || "PROD"}-${suffix}`;
      }

      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct._id}`, submitData);
        addToast({
          type: "success",
          title: "Product Updated",
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        await api.post("/admin/products", submitData);
        addToast({
          type: "success",
          title: "Product Created",
          description: `${formData.name} has been created successfully.`,
        });
      }

      closeModal();
      fetchProducts();
    } catch (error: any) {
      console.error("Error saving product:", error);

      const errorData = error.response?.data;
      if (errorData?.code === "SKU_EXISTS") {
        setFormErrors({ sku: "SKU already exists" });
        addToast({
          type: "error",
          title: "SKU Conflict",
          description: "A product with this SKU already exists.",
        });
      } else {
        addToast({
          type: "error",
          title: "Error",
          description:
            errorData?.message || "Failed to save product. Please try again.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (productId: string) => {
    const product = products.find((p) => p._id === productId);
    if (
      !confirm(
        `Are you sure you want to delete "${product?.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/admin/products/${productId}`);
      addToast({
        type: "success",
        title: "Product Deleted",
        description: `${product?.name} has been deleted successfully.`,
      });
      fetchProducts();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      const errorData = error.response?.data;

      if (errorData?.code === "PRODUCT_IN_USE") {
        addToast({
          type: "warning",
          title: "Cannot Delete Product",
          description:
            "This product is being used in orders or invoices. Consider deactivating it instead.",
        });
      } else {
        addToast({
          type: "error",
          title: "Delete Failed",
          description:
            errorData?.message || "Failed to delete product. Please try again.",
        });
      }
    }
  };

  const toggleProductStatus = async (
    productId: string,
    currentStatus: boolean
  ) => {
    try {
      await api.put(`/admin/products/${productId}`, {
        isActive: !currentStatus,
      });
      addToast({
        type: "success",
        title: "Product Status Updated",
        description: `Product has been ${
          !currentStatus ? "activated" : "deactivated"
        }.`,
      });
      fetchProducts();
    } catch (error) {
      console.error("Error updating product status:", error);
      addToast({
        type: "error",
        title: "Update Failed",
        description: "Failed to update product status. Please try again.",
      });
    }
  };

  const handleExport = async (format: "csv" | "excel") => {
    try {
      const exportColumns = commonColumns.product.map((col) => ({
        ...col,
        format: col.format || ((value: any) => String(value || "")),
      }));

      await exportData(products, exportColumns, format, {
        filename: `products-${new Date().toISOString().split("T")[0]}`,
        includeHeaders: true,
      });

      addToast({
        type: "success",
        title: "Export Successful",
        description: `Products exported to ${format.toUpperCase()} successfully.`,
      });
    } catch (error) {
      console.error("Error exporting products:", error);
      addToast({
        type: "error",
        title: "Export Failed",
        description: "Failed to export products. Please try again.",
      });
    }
  };

  // Table columns definition
  const columns = [
    {
      key: "name",
      label: "Product Name",
      sortable: true,
      render: (value: string, product: Product) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          {/* SKU hidden per simplified spec */}
        </div>
      ),
    },
    // {
    //   key: "price",
    //   label: "Price",
    //   sortable: true,
    //   render: (value: number, product: Product) => (
    //     <div>
    //       <div className="font-medium">${Number(value ?? 0).toFixed(2)}</div>
    //     </div>
    //   ),
    // },
    {
      key: "quantity",
      label: "Stock",
      sortable: true,
      render: (value: number, product: Product) => {
  const qty = Number(value ?? 0);
  const isLowStock = false; // minStock removed in simplified schema
  const isOutOfStock = qty === 0;

        return (
          <div className="flex items-center space-x-2">
            <span
              className={`font-medium ${
                isOutOfStock
                  ? "text-red-600"
                  : isLowStock
                  ? "text-yellow-600"
                  : "text-green-600"
              }`}
            >
              {qty}
            </span>
            {isOutOfStock && <AlertTriangle className="w-4 h-4 text-red-500" />}
            {isLowStock && !isOutOfStock && (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}
          </div>
        );
      },
    },
    // {
    //   key: "tax",
    //   label: "Tax",
    //   sortable: true,
    //   render: (value: number) => (
    //     <span>{Number((value ?? 0) * 100).toFixed(1)}%</span>
    //   ),
    // },
    {
      key: "actions",
      label: "Actions",
      render: (_: any, product: Product) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleProductStatus(product._id, product.isActive)}
          >
            {product.isActive ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(product)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(product._id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Filter options
  const filterOptions: any[] = [];

  return (

      <div className="space-y-6 p-4 md:p-6">
        <EnhancedDataTable
          title="Products"
          description="Manage your product inventory and pricing"
          data={products}
          columns={columns}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          onSearch={handleSearch}
          onFilter={handleFilter}
          onExport={handleExport}
          filters={filterOptions}
          searchPlaceholder="Search products by name, SKU, or description..."
          actions={{
            create: {
              label: "Add Product",
              onClick: handleNewProduct,
            },
          }}
          selectable={false}
        />

        {/* Product Form Modal */}
        <FormModal
          isOpen={showAddModal}
          onClose={closeModal}
          title={editingProduct ? "Edit Product" : "Add New Product"}
          onSubmit={handleSubmit}
          submitLabel={editingProduct ? "Update Product" : "Add Product"}
          loading={submitting}
          size="lg"
        >
          <div className="space-y-6">
            <FormSection title="Basic Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Product Name"
                  required
                  error={formErrors.name}
                >
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Pricing">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Price" required error={formErrors.price}>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </FormField>

                <FormField label="Tax (%)" error={formErrors.tax}>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.tax}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        // Store as percent in UI state
                        tax: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Inventory">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Quantity"
                  required
                  error={formErrors.quantity}
                >
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        quantity: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </FormField>
              </div>
            </FormSection>

            {/* Additional Information removed as requested */}
          </div>
        </FormModal>
      </div>

  );
}
