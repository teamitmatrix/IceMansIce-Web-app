"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries } from "@/lib/countries";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  User, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign,
  Save,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react";
import axios from "@/lib/axios";

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  password: string; // new field
  address: {
    street: string;
    city: string;
    stateZip: string;
    country?: string;
  };
}

interface ExistingCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export default function CreateCustomer() {
  const router = useRouter();
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    email: "",
    phone: "",
    password: "",
    address: {
      street: "",
      city: "",
      stateZip: "",
      country: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<ExistingCustomer | null>(null);
  const [createdCustomer, setCreatedCustomer] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (field: string, value: string | number) => {
    if (field.startsWith("address.")) {
      const addressField = field.split(".")[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) return "Customer name is required";
    if (!formData.phone.trim()) return "Phone number is required";
    if (formData.phone.length < 10) return "Phone number must be at least 10 digits";
    // Email, password, and address are now optional
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return "Please enter a valid email address";
    }
    if (formData.password && formData.password.length > 0 && formData.password.length < 8) {
      return "Password must be at least 8 characters";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setExistingCustomer(null);

      // Post only the required/basic fields
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password, // send
        address: formData.address,
      };
      const response = await axios.post("/driver/customers", payload);
      
      setSuccess(true);
      setCreatedCustomer(response.data.customer);
      
      setTimeout(() => {
        // Redirect to customer details or back to search
        router.push(`/driver/customers/${response.data.customer.id}`);
      }, 2000);

    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.existingCustomer) {
        setExistingCustomer(err.response.data.existingCustomer);
        setError(err.response.data.message);
      } else {
        setError(err.response?.data?.message || "Failed to create customer");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUseExistingCustomer = () => {
    if (existingCustomer) {
      router.push(`/driver/customers/${existingCustomer.id}`);
    }
  };

  // Removed currency formatter (credit display removed)

  if (success && createdCustomer) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Customer Created Successfully!</h2>
            <p className="text-green-700 mb-6">
              {createdCustomer.name} has been added to your customer database.
            </p>
            <div className="bg-white rounded-lg p-4 mb-6 border border-green-200">
              <h3 className="font-semibold text-gray-900 mb-2">Customer Details:</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Name:</strong> {createdCustomer.name}</p>
                <p><strong>Phone:</strong> {createdCustomer.phone}</p>
                {createdCustomer.email && <p><strong>Email:</strong> {createdCustomer.email}</p>}
              </div>
            </div>
            <p className="text-sm text-green-600">Redirecting to customer details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button 
          onClick={() => router.back()} 
          variant="outline" 
          size="sm"
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg p-6 flex-1">
          <h1 className="text-2xl font-bold mb-2">Create New Customer</h1>
          <p className="text-blue-100">Add a new customer profile to the system</p>
        </div>
      </div>

      {/* Existing Customer Warning */}
      {existingCustomer && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              <span>Customer Already Exists</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 mb-4">{error}</p>
            <div className="bg-white rounded-lg p-4 mb-4 border border-orange-200">
              <h3 className="font-semibold text-gray-900 mb-2">Existing Customer:</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Name:</strong> {existingCustomer.name}</p>
                <p><strong>Phone:</strong> {existingCustomer.phone}</p>
                {existingCustomer.email && <p><strong>Email:</strong> {existingCustomer.email}</p>}
              </div>
            </div>
            <div className="flex space-x-4">
              <Button 
                onClick={handleUseExistingCustomer}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Use Existing Customer
              </Button>
              <Button 
                onClick={() => {
                  setExistingCustomer(null);
                  setError("");
                }}
                variant="outline"
              >
                Create Different Customer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <span>Basic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter customer name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address (optional)"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password">Password (optional, default: password123)</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Set a login password (optional)"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="mt-1 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 mt-0.5"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <span>Address Information (Optional)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                type="text"
                placeholder="Enter street address (optional)"
                value={formData.address.street}
                onChange={(e) => handleInputChange("address.street", e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Enter city (optional)"
                  value={formData.address.city}
                  onChange={(e) => handleInputChange("address.city", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="stateZip">State & ZIP</Label>
                <Input
                  id="stateZip"
                  type="text"
                  placeholder="e.g. CA 90210 (optional)"
                  value={formData.address.stateZip}
                  onChange={(e) => handleInputChange("address.stateZip", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <Select
                value={formData.address.country || ""}
                onValueChange={(val) => handleInputChange("address.country", val)}
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
          </CardContent>
        </Card>

        {/* Account Settings removed per requirements */}

        {/* Error Display */}
        {error && !existingCustomer && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800 font-medium">Error</p>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex space-x-4">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating Customer...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Save className="h-5 w-5" />
                <span>Create Customer</span>
              </div>
            )}
          </Button>

          <Button
            type="button"
            onClick={() => router.back()}
            variant="outline"
            className="px-8"
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}