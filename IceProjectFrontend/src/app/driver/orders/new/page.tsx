"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Minus,
  ShoppingCart,
  User,
  Calculator,
  CreditCard
} from "lucide-react";
import axios from "@/lib/axios";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street?: string;
    city?: string;
  stateZip?: string;
    country?: string;
  };
      stateZip?: string;
  paymentTerms?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  tax?: number; // percentage (0-100)
}

interface OrderItem {
  id: string; // Unique ID for each line item
  productId: string;
  productName: string;
  price: number; // Keep for UI display
  unitPrice: number; // For backend API
  quantity: number;
  total: number;
  tax: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customerId");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [checkNumber, setCheckNumber] = useState<string>("");
  const [poNumber, setPoNumber] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("immediate");
  // COD flag derived from paymentMethod (cash => COD) so no separate state

  const fetchCustomer = useCallback(async () => {
    try {
      const response = await axios.get(`/driver/customers/${customerId}`);
      console.log("Raw customer from API:", response.data);
      // The API returns { customer, recentOrders, paymentHistory }
      setCustomer(response.data.customer);
    } catch (err: any) {
      setError("Failed to load customer details");
    } finally {
      setCustomerLoading(false);
    }
  }, [customerId]);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await axios.get("/driver/products");
      console.log("Raw products from API:", response.data);
      // Ensure tax field is properly mapped from the API response
      const productsWithTax = response.data.map((product: any) => {
        console.log(`Product ${product.name}: raw tax=${product.tax}, taxRate=${product.taxRate}`);
        let finalTax = 0;

        if (typeof product.tax === 'number') {
          // If tax is a small decimal (< 1), it's likely stored as decimal, convert to percentage
          finalTax = product.tax < 1 ? product.tax * 100 : product.tax;
        } else if (typeof product.taxRate === 'number') {
          // taxRate is typically decimal (0-1), convert to percentage
          finalTax = product.taxRate * 100;
        }

        // Round to 2 decimal places to avoid floating point precision issues
        finalTax = Math.round(finalTax * 100) / 100;

        console.log(`Product ${product.name}: final tax=${finalTax}%`);
        return {
          ...product,
          tax: finalTax
        };
      });
      console.log("Products with tax mapping:", productsWithTax);
      setProducts(productsWithTax);
    } catch (err: any) {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!customerId) {
      // If no customer specified, send driver to customers page to select one
      router.replace('/driver/customers');
      return;
    }
    fetchCustomer();
    fetchProducts();
  }, [customerId, router, fetchCustomer, fetchProducts]);

  const addToOrder = (product: Product) => {
    const stock = typeof product.stock === 'number' ? product.stock : Infinity;

    // Always add as a new line item to allow same product with different unit prices
    if (stock <= 0) {
      setError(`Insufficient stock for ${product.name}.`);
      return;
    }
    
    // Generate unique ID for this line item
    const lineItemId = `${product.id}-${Date.now()}-${Math.random()}`;
    
    setOrderItems([...orderItems, {
      id: lineItemId,
      productId: product.id,
      productName: product.name,
      price: 0,
      unitPrice: product.price,
      quantity: 1,
      total: 0,
      tax: 0,
    }]);
  };

  const updateQuantity = (lineItemId: string, newQuantity: number) => {
    const item = orderItems.find(i => i.id === lineItemId);
    if (!item) return;
    
    const prod = products.find(p => p.id === item.productId);
    const stock = typeof prod?.stock === 'number' ? prod.stock : Infinity;
    
    // Calculate total quantity of this product across all line items except current one
    const otherItemsQty = orderItems
      .filter(i => i.productId === item.productId && i.id !== lineItemId)
      .reduce((sum, i) => sum + i.quantity, 0);
    
    const maxAllowed = stock - otherItemsQty;
    const clamped = Math.max(0, Math.min(newQuantity, maxAllowed));
    
    if (newQuantity === 0 || clamped === 0) {
      setOrderItems(orderItems.filter(i => i.id !== lineItemId));
    } else {
      setOrderItems(orderItems.map(i =>
        i.id === lineItemId
          ? { ...i, quantity: clamped, total: clamped * i.price }
          : i
      ));
    }
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    const totalTax = orderItems.reduce((sum, item) => {
      const rate = item.tax / 100;
      const itemTax = item.total * rate;
      return sum + itemTax;
    }, 0);
    return totalTax;
  };


  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const formatAddress = (address: Customer['address']) => {
    if (!address) return "No address provided";
    const parts = [
      address.street,
      address.city,
      address.stateZip,
      address.country
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "No address provided";
  };

  const handleSubmitOrder = async () => {
    // Validation checks
    if (orderItems.length === 0) {
      setError("Please add at least one item to the order");
      return;
    }

    if (!customerId) {
      setError("Customer information is missing");
      return;
    }

    if (!customer) {
      setError("Customer details not loaded");
      return;
    }

    // Validate order items
    for (const item of orderItems) {
      if (!item.productName || item.productName.trim() === "") {
        setError("Invalid product name in order items");
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        setError("Invalid quantity in order items");
        return;
      }
      // if (!item.unitPrice || item.unitPrice <= 0) {
      //   setError("Invalid price in order items");
      //   return;
      // }
    }

    setSubmitting(true);
    setError("");

    try {
      // Transform orderItems to match backend schema
      const backendItems = orderItems.map(item => ({
        productName: item.productName.trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.price),
        discount: 0,
        taxRate: Number(item.tax) / 100,
      }));


      const orderData = {
        customerId: customerId,
        items: backendItems,
        paymentMethod,
        checkNumber: paymentMethod === 'check' ? checkNumber.trim() || undefined : undefined,
        poNumber: poNumber.trim() || undefined,
        paymentTerms,
        deliveryAddress: customer.address ? {
          street: customer.address.street || "",
          city: customer.address.city || "",
          stateZip: customer.address.stateZip || "",
          country: customer.address.country || "",
        } : undefined
      };

      console.log("Submitting order data:", orderData);

      // Step 1: Create the order
      const orderResponse = await axios.post("/driver/orders", orderData);
      const createdOrder = orderResponse.data.order;
      console.log("Order created:", createdOrder);

      // Step 2: Immediately generate invoice with selected payment method
      try {
        // const invoicePayload: any = { orderId: createdOrder._id || createdOrder.id, paymentMethod,poNumber: poNumber.trim() || createdOrder.poNumber || undefined, };
        // const invoiceRes = await axios.post('/driver/invoices', invoicePayload);
        // const invoice = invoiceRes.data.invoice;
        // router.push(`/driver/invoices/${invoice._id || invoice.id}`);

        // Step 3: Navigate to order details  
        router.push(`/driver/orders`);
      } catch (invErr: any) {
        console.error('Invoice generation failed after order create', invErr);
        // Fallback: navigate to order details if invoice fails
        router.push(`/driver/orders/${createdOrder._id || createdOrder.id}`);
      }
    } catch (err: any) {
      console.error("Order creation error:", err);
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to create order";
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    false
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <ShoppingCart className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
            <p className="text-lg font-medium text-gray-700">Loading order form...</p>
          </div>
        </div>
      </div>
    );
  }
  if (customerLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <ShoppingCart className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
            <p className="text-lg font-medium text-gray-700">Loading customer details...</p>
          </div>
        </div>
      </div>
    );
  }
  if (!customer) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-800 font-medium">Customer not found</p>
            <Button onClick={() => router.back()} className="mt-4" variant="outline">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!customerId) {
    return null; // Redirect in progress
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex flex-col items-start md:flex-row md:items-center justify-between">
            <div className="flex flex-col items-start md:flex-row  md:items-center space-x-4">
              <Button
                onClick={() => router.back()}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Create New Order
                </h1>
                <p className="text-gray-600 mt-1">Add items and create order for customer</p>
              </div>
            </div>
            <div className="self-center flex flex-row items-center gap-2 md:gap-0 md:flex-col text-right">
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-semibold text-gray-900">{customer.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Selection */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Select Products</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => {
                  // Sum all quantities of this product across all line items
                  const totalQuantity = orderItems
                    .filter(i => i.productId === product.id)
                    .reduce((sum, item) => sum + item.quantity, 0);
                  const atMax = typeof product.stock === 'number' && totalQuantity >= product.stock;
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{product.name}</h3>
                        <div className="flex items-center space-x-4 mt-1">
                          {/* <span className="text-lg font-semibold text-green-600">
                            ${product.price.toFixed(2)}
                          </span> */}

                          <span className="text-sm text-gray-500">
                            Stock: {product.stock}
                          </span>

                          {/* {(product.tax && product.tax > 0) && (
                            <span className="text-sm text-blue-600">
                              Tax: {product.tax % 1 === 0 ? product.tax : product.tax.toFixed(2)}%
                            </span>
                          )} */}
                        </div>
                      </div>
                      <Button
                        onClick={() => addToOrder(product)}
                        size="sm"
                        disabled={product.stock === 0 || atMax}
                        className="ml-4"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No products found matching your search.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Customer Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Name:</strong> {customer.name}</p>
                <p><strong>Email:</strong> {customer.email}</p>
                <p><strong>Phone:</strong> {customer.phone}</p>
                <p><strong>Address:</strong> {formatAddress(customer.address)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>Order Items ({orderItems.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orderItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items added yet. Select products from the left panel.
                </div>
              ) : (
                <div className="space-y-3">
                  {orderItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border rounded-lg space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">{item.productName}</h4>
                        <Button
                          onClick={() => updateQuantity(item.id, 0)}
                          size="sm"
                          variant="destructive"
                        >
                          Remove
                        </Button>
                      </div>

                      {/* Price & Tax Inputs */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Price</Label>
                          <Input
                            type="number"
                            value={item.price}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setOrderItems(orderItems.map(i =>
                                i.id === item.id
                                  ? { ...i, price: val, unitPrice: val, total: val * i.quantity }
                                  : i
                              ));
                            }}
                            placeholder="Enter price"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tax (%)</Label>
                          <Input
                            type="number"
                            value={item.tax}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setOrderItems(orderItems.map(i =>
                                i.id === item.id
                                  ? { ...i, tax: val }
                                  : i
                              ));
                            }}
                            placeholder="Tax %"
                          />
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            size="sm"
                            variant="outline"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                            className="w-12 text-center"
                          />
                          <Button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            size="sm"
                            variant="outline"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="font-semibold">${item.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}

                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Total */}
          {orderItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Order Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${calculateTax().toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* PO Number and Payment Terms */}
                <div className="mt-6 space-y-4">
                  <div>
                    <Label htmlFor="poNumber" className="text-sm font-medium text-gray-700">
                      PO Number (Optional)
                    </Label>
                    <Input
                      id="poNumber"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="Enter purchase order number"
                      className="mt-1"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <Label htmlFor="paymentTerms" className="text-sm font-medium text-gray-700">
                      Payment Terms
                    </Label>
                    <select
                      id="paymentTerms"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="due on cash">Due on Cash</option>
                      <option value="immediate">Immediate</option>
                      <option value="net7">Net 7 Days</option>
                      <option value="net10">Net 10 Days</option>
                      <option value="net15">Net 15 Days</option>
                      <option value="net30">Net 30 Days</option>
                      <option value="net60">Net 60 Days</option>
                    </select>
                  </div>
                </div>

                {/* Payment Method Selection (Radio Cards) - Cash, Pay Online, Check, and Charged */}
                <div className="mt-6 space-y-4">
                  <p className="text-sm font-medium text-gray-700">Payment Method</p>
                  <div className="grid sm:grid-cols-4 gap-3">
                    {[
                      { value: 'cash', label: 'Cash', icon: '💵', desc: 'Collect cash on delivery' },
                      { value: 'online', label: 'Pay Online', icon: '🌐', desc: 'Customer pays online now or later' },
                      { value: 'check', label: 'Check', icon: '💳', desc: 'Customer pays by check' },
                      { value: 'charged', label: 'Charged', icon: '📝', desc: 'No payment collected - bill to account' },
                    ].map(opt => {
                      const active = paymentMethod === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className={`relative cursor-pointer rounded-lg border p-3 flex flex-col justify-between text-left transition shadow-sm hover:shadow-md text-sm ${active ? 'border-blue-600 ring-2 ring-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={opt.value}
                            checked={active}
                            onChange={() => setPaymentMethod(opt.value)}
                            className="sr-only"
                          />
                          <div className="flex items-center mb-1">
                            <span className="text-lg mr-2" aria-hidden>{opt.icon}</span>
                            <span className="font-semibold text-gray-800">{opt.label}</span>
                          </div>
                          <p className="text-gray-600 text-xs leading-snug line-clamp-2">{opt.desc}</p>
                          {active && (
                            <span className="absolute top-2 right-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-600 text-white text-[10px] font-bold">✓</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {/* COD checkbox removed; cash selection implies COD */}
                  
                  {/* Check Number Field - Only shown when Check is selected */}
                  {paymentMethod === 'check' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Check Number
                      </label>
                      <input
                        type="text"
                        value={checkNumber}
                        onChange={(e) => setCheckNumber(e.target.value)}
                        placeholder="Enter check number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleSubmitOrder}
                  disabled={submitting || orderItems.length === 0}
                  className="w-full mt-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  {submitting ? "Creating Order..." : "Create Order"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}