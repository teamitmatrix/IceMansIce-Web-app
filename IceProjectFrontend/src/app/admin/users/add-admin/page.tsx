"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, UserPlus, Shield } from "lucide-react";
import api from "@/lib/axios";
import { countries } from "@/lib/countries";

interface AdminFormData {
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
  confirmPassword: string;
}

export default function AddAdminPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<AdminFormData>({
    name: "",
    email: "",
    phone: "",
    address: { street: "", city: "", stateZip: "", country: "" },
    password: "",
    confirmPassword: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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
    } else {
      const digits = formData.phone.replace(/\D/g, "");
      if (digits.length < 10) {
        errors.phone = "Phone number must be at least 10 digits";
      }
    }

    // Address validation
    if (!formData.address.street.trim()) {
      errors.address = "Street address is required";
    }
    if (!formData.address.city.trim()) {
      errors.address = (errors.address ? errors.address + "; " : "") + "City is required";
    }
    if (!formData.address.stateZip.trim()) {
      errors.address = (errors.address ? errors.address + "; " : "") + "State & ZIP is required";
    }

    if (!formData.password.trim()) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
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

      // Compose a single line address for backend compatibility
      // const addr = formData.address;
  // const addressLine = [
      //   addr.street,
      //   [addr.city, addr.state].filter(Boolean).join(", "),
  //   [addr.zipCode, addr.country].filter(Boolean).join(" "),
      // ]
      //   .filter(Boolean)
      //   .join(", ");

      // Normalize phone to match backend Joi /^\+?[0-9]+$/ and min length
      const rawPhone = formData.phone.trim();
      const onlyDigits = rawPhone.replace(/\D/g, "");
      const normalizedPhone = rawPhone.startsWith("+")
        ? `+${onlyDigits}`
        : onlyDigits;

      const submitData = {
        name: formData.name,
        email: formData.email,
        phone: normalizedPhone,
        address: formData.address,
        password: formData.password,
      };

      await api.post("/admin/users/add-admin", submitData);

      // Redirect to users page
      router.push("/admin/users");
    } catch (error: any) {
      console.error("Error creating admin:", error);
      if (error.response?.data?.message?.includes("Email")) {
        setFormErrors({ email: "Email already exists" });
      } else {
        setFormErrors({ general: "Failed to create admin user" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof AdminFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (formErrors[field as string]) {
      setFormErrors((prev) => ({
        ...prev,
        [field as string]: "",
      }));
    }
  };

  return (
      <div className="space-y-6 px-4 pt-4">
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
            <h1 className="text-2xl font-bold text-gray-900">Add New Admin</h1>
            <p className="text-gray-600">Create a new administrator account</p>
          </div>
        </div>

        {/* Form */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Admin Information
              </h2>
              <p className="text-sm text-gray-600">
                Enter the details for the new administrator
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
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={formErrors.name ? "border-red-500" : ""}
                  placeholder="Enter full name"
                />
                {formErrors.name && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={formErrors.email ? "border-red-500" : ""}
                  placeholder="Enter email address"
                />
                {formErrors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.email}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className={formErrors.phone ? "border-red-500" : ""}
                  placeholder="Enter phone number"
                />
                {formErrors.phone && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.phone}
                  </p>
                )}
              </div>

              {/* Address Section - similar to Register form */}
              <div className="md:col-span-2">
                <div className="rounded-xl border border-gray-200 bg-white">
                  <div className="p-4 space-y-4">
                    <div>
                      <Label htmlFor="street">Street Address *</Label>
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
                        placeholder="Enter street address"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
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
                          placeholder="Enter city"
                        />
                      </div>
                      <div>
                        <Label htmlFor="stateZip">State & ZIP *</Label>
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
                          placeholder="e.g. CA 90210"
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
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select a country" /></SelectTrigger>
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
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  className={formErrors.password ? "border-red-500" : ""}
                  placeholder="Enter password (min 8 characters)"
                />
                {formErrors.password && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.password}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  className={formErrors.confirmPassword ? "border-red-500" : ""}
                  placeholder="Confirm password"
                />
                {formErrors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.confirmPassword}
                  </p>
                )}
              </div>
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
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              >
                {submitting ? (
                  "Creating Admin..."
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Admin
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Info Card */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Admin Privileges</h3>
              <p className="text-sm text-blue-800 mt-1">
                New administrators will have full access to all system features
                including user management, product management, order processing,
                and system reports.
              </p>
            </div>
          </div>
        </Card>
      </div>
  );
}
