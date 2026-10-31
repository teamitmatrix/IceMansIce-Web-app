"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign,
  FileText,
  Plus,
  Eye,
  UserPlus,
  RotateCcw
} from "lucide-react";
import axios from "@/lib/axios";

// Simple debounce function
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

interface Customer {
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
}

export default function CustomerSearch() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term.length < 2) {
        setCustomers([]);
        return;
      }

      try {
        setLoading(true);
        setError("");
        
        const response = await axios.get("/driver/customers/search", {
          params: { term, limit: 20 }
        });
        
        setCustomers(response.data.customers || []);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to search customers");
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleCreateOrder = () => {
    if (selectedCustomer) {
      router.push(`/driver/orders/new?customerId=${selectedCustomer.id}`);
    }
  };

  const handleViewDetails = () => {
    if (selectedCustomer) {
      router.push(`/driver/customers/${selectedCustomer.id}`);
    }
  };

  // Removed balance/active/payment terms helpers per requirements

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
      {/* Page Header (without action button) */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Customer Search
          </h1>
          <p className="text-gray-600 mt-1">Search for customers to create orders and process payments</p>
        </div>
      </div>

      <div className="space-y-6">

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-blue-600" />
            <span>Find Customer</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 text-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          {loading && (
            <div className="text-center py-4">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-gray-600">Searching...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <p className="text-red-800 font-medium">Search Error</p>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action: New Customer (moved here after search section) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 -mt-2">
        <div className="text-sm text-gray-500">
          {customers.length > 0
            ? `Showing ${customers.length} result${customers.length !== 1 ? 's' : ''}`
            : searchTerm.length < 2
              ? 'Enter at least 2 characters to start searching'
              : 'No results yet'}
        </div>
        <Button
          onClick={() => router.push("/driver/customers/new")}
          className="h-12 w-full sm:w-auto px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          New Customer
        </Button>
      </div>

      {/* Search Results */}
      {customers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results ({customers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedCustomer?.id === customer.id
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => handleCustomerSelect(customer)}
                >
                  <div className="flex flex-wrap items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                          <div className="flex flex-wrap items-center space-x-4 text-sm text-gray-600">
                            {customer.email && (
                              <div className="flex items-center space-x-1">
                                <Mail className="h-3 w-3" />
                                <span>{customer.email}</span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="h-3 w-3" />
                                <span>{customer.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {customer.address && (
                        <div className="flex flex-wrap items-center space-x-1 text-sm text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {[
                            
                              customer.address.street,
                              customer.address.city,
                              customer.address.state,
                              customer.address.zipCode
                            ].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}

                      {/* Removed balance, active status, and payment terms display */}
                    </div>

                    {selectedCustomer?.id === customer.id && (
                      <div className="ml-4">
                        <Badge className="bg-blue-500 text-white">
                          Selected
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Customer Actions */}
      {selectedCustomer && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-800">
              <User className="h-5 w-5" />
              <span>Selected Customer: {selectedCustomer.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={handleCreateOrder}
                className="h-16 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              >
                <div className="text-center">
                  <Plus className="h-6 w-6 mx-auto mb-1" />
                  <span className="font-medium">Create New Order</span>
                </div>
              </Button>
              
              <Button 
                onClick={handleViewDetails}
                variant="outline"
                className="h-16 border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <div className="text-center">
                  <Eye className="h-6 w-6 mx-auto mb-1" />
                  <span className="font-medium">View Details</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {searchTerm.length >= 2 && customers.length === 0 && !loading && !error && (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-600 mb-4">
              No customers match your search criteria "{searchTerm}". 
              Try a different search term or create a new customer profile.
            </p>
            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => router.push("/driver/customers/new")}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white flex items-center space-x-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Create New Customer</span>
              </Button>
              <Button
                onClick={() => setSearchTerm("")}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Clear Search</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Instructions */}
      {searchTerm.length < 2 && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Search for Customers</h3>
            <p className="text-gray-600">
              Enter at least 2 characters to search for customers by name, email, or phone number.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
    </div>
  );
}