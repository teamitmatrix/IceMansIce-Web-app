"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@radix-ui/react-select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Package, Plus } from "lucide-react";
import api from "@/lib/axios";

interface ProductFormData {
  name: string;
  sku: string;
  description: string;
  price: number;
  quantity: number;
  tax: number;
  unit: string;
  isActive: boolean;
  tags: string[];
}

export default function NewProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    sku: "",
    description: "",
    price: 0,
    quantity: 0,
    tax: 0,
    unit: "piece",
    isActive: true,
    tags: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const units = [
    { value: "piece", label: "Piece" },
    { value: "box", label: "Box" },
    { value: "case", label: "Case" },
    { value: "pound", label: "Pound" },
    { value: "gallon", label: "Gallon" },
    { value: "liter", label: "Liter" },
  ];

  

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Product name is required";
    }

    if (!formData.sku.trim()) {
      errors.sku = "SKU is required";
    }

    if (formData.price < 0) {
      errors.price = "Price must be greater than 0";
    }

    // pricePerUnit and min/max stock removed in simplified schema

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

      const submitData = {
        ...formData,
        sku: formData.sku.toUpperCase(),
      };

      await api.post("/admin/products", submitData);

      // Redirect to products page
      router.push("/admin/products");
    } catch (error: any) {
      console.error("Error creating product:", error);
      if (error.response?.data?.message?.includes("SKU")) {
        setFormErrors({ sku: "SKU already exists" });
      } else {
        setFormErrors({ general: "Failed to create product" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <>
      <div className="space-y-6 mx-10">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Add New Product
            </h1>
            <p className="text-gray-600">
              Create a new product in your inventory
            </p>
          </div>
        </div>

        {/* Form */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Product Information
              </h2>
              <p className="text-sm text-gray-600">
                Enter the details for the new product
              </p>
            </div>
          </div>

          {formErrors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{formErrors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={formErrors.name ? "border-red-500" : ""}
                  placeholder="Enter product name"
                />
                {formErrors.name && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) =>
                    handleInputChange("sku", e.target.value.toUpperCase())
                  }
                  className={formErrors.sku ? "border-red-500" : ""}
                  placeholder="Enter SKU (will be converted to uppercase)"
                />
                {formErrors.sku && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.sku}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>

              {/* <div>
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    handleInputChange("price", parseFloat(e.target.value) || 0)
                  }
                  className={formErrors.price ? "border-red-500" : ""}
                  placeholder="0.00"
                />
                {formErrors.price && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.price}
                  </p>
                )}
              </div> */}

              {/* pricePerUnit removed in simplified schema */}

              <div>
                <Label htmlFor="quantity">Initial Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    handleInputChange("quantity", parseInt(e.target.value) || 0)
                  }
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="unit">Unit</Label>
                <select
                  value={formData.unit}
                  onChange={(e) => handleInputChange("unit", e.target.value)}
                >
                  {units.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* <div>
                <Label htmlFor="tax">Tax (%)</Label>
                <Input
                  id="tax"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax * 100}
                  onChange={(e) =>
                    handleInputChange(
                      "tax",
                      (parseFloat(e.target.value) || 0) / 100
                    )
                  }
                  placeholder="0.00"
                />
              </div> */}

              {/* cost removed in simplified schema */}

              <div>
                
              </div>

              {/* min/max stock removed in simplified schema */}
            </div>

            {/* Tags */}
            {/* <div>
              <Label htmlFor="tags">Tags</Label>
              <div className="flex space-x-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter tag and press Enter"
                />
                <Button type="button" onClick={addTag} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div> */}

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  handleInputChange("isActive", e.target.checked)
                }
                className="rounded"
              />
              <Label htmlFor="isActive">Product is active</Label>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                {submitting ? (
                  "Creating Product..."
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    Create Product
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Info Card */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <Package className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">
                Product Guidelines
              </h3>
              <ul className="text-sm text-blue-800 mt-1 space-y-1">
                <li>• SKU must be unique across all products</li>
                <li>• Tax rate is entered as a percentage (e.g., 10 for 10%)</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
