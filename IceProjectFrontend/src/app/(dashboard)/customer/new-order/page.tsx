"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
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
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { set } from "zod";
import api from "@/lib/axios";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  paymentTerms?: string | number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock?: number;
  tax?: number; // percentage (0-100)
}

interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  unitPrice: number;
  quantity: number;
  total: number;
}

export default function NewCustomerOrderPage() {
  const router = useRouter();
  


  const [customer, setCustomer] = useState<Customer | null>(null);
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
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  const fetchCustomer = useCallback(async () => {
    try {
      // First, fetch basic user info to determine role
      const me = await axios.get("/auth/me");
     
      const user = me.data?.user;
      console.log("Authenticated user:", user);
     
      if (user?.role == "customer") {
        try {
          const response = await api.get("/customers/det/profile",{headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
          console.log("Customer profile:", response);
          if (response.data?.customer) {
            setCustomer(response.data.customer);
            return;
          }
        } catch (err) {
          console.error("Failed to fetch customer profile:", err);
          // If customer profile missing, synthesize from user record below
        }
      }

      // Synthesize a minimal customer object from user info
      if (user) {
        setCustomer({
          id: user.customerId || user.id,
          name: user.name || user.email || "Customer",
          email: user.email || "",
          phone: user.phone || "",
          address: user.address || {},
          paymentTerms: (user as any).paymentTerms || undefined,
        });
        return;
      }
      setError("Failed to load customer details");
    } catch (e) {
      setError("Failed to load customer details");
      console.error("Error in fetchCustomer:", e);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      // Use generic products endpoint (accessible to Customer role)
      const response = await axios.get("/products", { params: { limit: 100, isActive: true } });
      console.log("Raw products from API:", response.data);
      const list = response.data.products || response.data || [];
      const mapped: Product[] = list.map((p: any) => {
        console.log(`Product ${p.name}: raw tax=${p.tax}, taxRate=${p.taxRate}`);
        let finalTax = 0;
        
        if (typeof p.tax === 'number') {
          // If tax is a small decimal (< 1), it's likely stored as decimal, convert to percentage
          finalTax = p.tax < 1 ? p.tax * 100 : p.tax;
        } else if (typeof p.taxRate === 'number') {
          // taxRate is typically decimal (0-1), convert to percentage
          finalTax = p.taxRate * 100;
        }
        
        // Round to 2 decimal places to avoid floating point precision issues
        finalTax = Math.round(finalTax * 100) / 100;
        
        console.log(`Product ${p.name}: final tax=${finalTax}%`);
        return {
          id: p.id || p._id,
          name: p.name,
          price: Number(p.price || 0),
          category: p.category,
          // Source of truth: Product.quantity in DB
          stock: typeof p.quantity === "number" ? p.quantity : Number(p.quantity ?? p.stock ?? 0),
          // Properly handle tax conversion
          tax: finalTax,
        };
      });
      console.log("Products with tax mapping:", mapped);
      setProducts(mapped);
    } catch (err: any) {
      setError("Failed to load products");
      console.error("Error in fetchProducts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const data = localStorage.getItem('user');
    const user = data ? JSON.parse(data) : null;
    console.log("User data from localStorage:", user);
    setCustomer(user);
    fetchCustomer();
    fetchProducts();
  }, [fetchCustomer, fetchProducts]);

  const addToOrder = (product: Product) => {
    const existingItem = orderItems.find((item) => item.productId === product.id);
    const stock = typeof product.stock === "number" ? product.stock : Infinity;

    if (existingItem) {
      const nextQty = existingItem.quantity + 1;
      if (nextQty > stock) {
        setError(`Insufficient stock for ${product.name}. Available: ${stock}`);
        return;
      }
      setOrderItems(
        orderItems.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: nextQty, total: nextQty * item.price }
            : item
        )
      );
    } else {
      if (stock <= 0) {
        setError(`Insufficient stock for ${product.name}.`);
        return;
      }
      setOrderItems([
        ...orderItems,
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          unitPrice: product.price,
          quantity: 1,
          total: product.price,
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const prod = products.find((p) => p.id === productId);
    const stock = typeof prod?.stock === "number" ? prod.stock : Infinity;
    const clamped = Math.max(0, Math.min(newQuantity, stock));
    if (newQuantity === 0) {
      setOrderItems(orderItems.filter((item) => item.productId !== productId));
    } else {
      setOrderItems(
        orderItems.map((item) =>
          item.productId === productId
            ? { ...item, quantity: clamped, total: clamped * item.price }
            : item
        )
      );
    }
  };

  const calculateSubtotal = () => orderItems.reduce((sum, item) => sum + item.total, 0);
  const calculateTax = () => {
    // Sum per-item tax using the product's percentage
    const totalTax = orderItems.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.productId);
      const pct = prod && typeof prod.tax === 'number' ? prod.tax : 0;
      const rate = pct / 100;
      const itemTax = item.total * rate;
      console.log(`Tax calculation for ${item.productName}: ${pct}% of $${item.total} = $${itemTax}`);
      return sum + itemTax;
    }, 0);
    console.log(`Total tax calculated: $${totalTax}`);
    return totalTax;
  };
  const calculateTotal = () => calculateSubtotal() + calculateTax();

  const formatAddress = (address: Customer["address"]) => {
    if (!address) return "No address provided";
    if (typeof address === "string") {
  const trimmed = (address as string).trim();
  return trimmed.length ? trimmed : "No address provided";
}

    const parts = [address.street, address.city, address.state, address.zipCode].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "No address provided";
  };

  // Try to parse a simple comma-separated address string like
  // "123 Main St, City, State, 12345" into structured fields.
  type ParsedAddress = { street: string; city: string; state: string; zipCode: string; country?: string };
  const parseAddressString = (addr: string): ParsedAddress => {
    const parts = addr.split(',').map(p => p.trim()).filter(Boolean);
    // Default empty structured object
    let street = '', city = '', state = '', zipCode = '';
    if (parts.length >= 4) {
      [street, city, state, zipCode] = [parts[0], parts[1], parts[2], parts.slice(3).join(' ')];
    } else if (parts.length === 3) {
      [street, city, state] = parts;
    } else if (parts.length === 2) {
      [street, city] = parts;
    } else if (parts.length === 1) {
      street = parts[0];
    }
    return { street, city, state, zipCode, country: '' };
  };

  const handleSubmitOrder = async () => {
    if (orderItems.length === 0) {
      setError("Please add at least one item to the order");
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
      
    }

    setSubmitting(true);
    setError("");

    try {
      const backendItems = orderItems.map((item) => {
        const prod = products.find(p => p.id === item.productId);
        const pct = prod && typeof prod.tax === 'number' ? prod.tax : 0;
        const taxRate = pct / 100;
        return {
          productName: item.productName.trim(),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discount: 0,
          taxRate,
          
        };
      });
      console.log("customer",customer);

      const orderData: any = {
        items: backendItems,
        paymentMethod,
        checkNumber: paymentMethod === 'check' ? checkNumber.trim() || undefined : undefined,
        poNumber: poNumber.trim() || undefined,
        paymentTerms,
        specialInstructions: specialInstructions.trim() || undefined,
        deliveryAddress: customer.address,
        
      };

      // if (customer.address) {
      //   if (typeof customer.address === 'string') {
      //     const parsed = parseAddressString(customer.address);
      //     orderData.deliveryAddress = {
      //       street: parsed.street,
      //       city: parsed.city,
      //       state: parsed.state,
      //       zipCode: parsed.zipCode,
      //       country: parsed.country,
      //     };
      //   } else {
      //     orderData.deliveryAddress = {
      //       street: customer.address.street || "",
      //       city: customer.address.city || "",
      //       state: customer.address.state || "",
      //       zipCode: customer.address.zipCode || "",
      //       country: customer.address.country || "",
      //     };
      //   }
      // }
     
      console.log(customer.address?.street);
      console.log(orderData.deliveryAddress?.street);

  // Create the order via customer portal API
  const orderRes = await axios.post("/customer-portal/orders", orderData);
  const createdOrder = orderRes.data?.order || orderRes.data;
     
  // Immediately generate invoice and redirect to invoice page (parity with driver)
  // const invRes = await axios.post('/customer-portal/invoices', { orderId: createdOrder._id || createdOrder.id, paymentMethod });
  // const invoice = invRes.data?.invoice || invRes.data;
  setSubmitting(false);
      toast.success("Order created successfully");
      setOrderItems([]);
  // router.push(`/customer/invoices/${invoice._id || invoice.id}`);
    } catch (err: any) {
      const baseMessage = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to create order";
      const details: Array<{ field?: string; message?: string }> = err.response?.data?.details || [];
      const detailMsg = details.length ? `: ${details.map(d => `${d.field || 'field'} - ${d.message}`).join('; ')}` : '';
      setError(baseMessage + detailMsg);
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
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

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex flex-col md:flex-row items-center space-x-4">
              <Button onClick={() => router.back()} variant="outline" size="sm" className="self-start flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Create New Order
                </h1>
                <p className="text-gray-600 mt-1">Add items and create order</p>
              </div>
            </div>
            <div className="flex flex-row items-center gap-2 md:flex-col md:gap-0 text-right">
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-semibold text-gray-900">{customer.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2  gap-8">
        {/* Product Selection */}
        <div className="space-y-6 order-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Select Products</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full" />
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => {
                  const existingItem = orderItems.find((i) => i.productId === product.id);
                  const stock = typeof product.stock === "number" ? product.stock : undefined;
                  const atMax = typeof stock === "number" && typeof existingItem?.quantity === "number" && existingItem.quantity >= stock;
                  return (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{product.name}</h3>
                      <div className="flex items-center space-x-4 mt-1">
                        {/* <span className="text-lg font-semibold text-green-600">${product.price.toFixed(2)}</span> */}
                        
                        {typeof product.stock === "number" && (
                          <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                        )}
                        
                        {/* {(product.tax && product.tax > 0) && (
                          <span className="text-sm text-blue-600">
                            Tax: {product.tax % 1 === 0 ? product.tax : product.tax.toFixed(2)}%
                          </span>
                        )} */}
                      </div>
                    </div>
                    <Button onClick={() => addToOrder(product)} size="sm" disabled={product.stock === 0 || atMax} className="ml-4">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                );})}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">No products found matching your search.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6 order-3">
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
                <p>
                  <strong>Name:</strong> {customer.name}
                </p>
                <p>
                  <strong>Email:</strong> {customer.email}
                </p>
                <p>
                  <strong>Phone:</strong> {customer.phone}
                </p>
                <p>
                  <strong>Address:</strong> {formatAddress(customer.address)}
                </p>
                
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="order-3">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>Order Items ({orderItems.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orderItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No items added yet. Select products from the left panel.</div>
              ) : (
                <div className="space-y-3">
                  {orderItems.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.productName}</h4>
                        {/* <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p> */}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button onClick={() => updateQuantity(item.productId, item.quantity - 1)} size="sm" variant="outline">
                          <Minus className="h-3 w-3" />
                        </Button>
                        {/* show an input so user can also enter quantity */}
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value))}
                          className="w-12 text-center"
                        />
                        <Button onClick={() => updateQuantity(item.productId, item.quantity + 1)} size="sm" variant="outline">
                          <Plus className="h-3 w-3" />
                        </Button>
                        {/* <span className="ml-4 font-semibold">${item.total.toFixed(2)}</span> */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Total and Payment */}
          {orderItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Order Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* <div className="space-y-2">
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
                </div> */}

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
                    <Label htmlFor="specialInstructions" className="text-sm font-medium text-gray-700">
                      Special Instructions (Optional)
                    </Label>
                    <Input
                      id="specialInstructions"
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="Enter any special instructions"
                      className="mt-1"
                      maxLength={1000}
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

                {/* Payment Method Selection - radio cards matching driver style */}
                <div className="mt-6 space-y-4">
                  <p className="text-sm font-medium text-gray-700">Payment Method</p>
                  <div className="grid sm:grid-cols-4 gap-3">
                    {[
                      { value: "cash", label: "Cash", icon: "💵", desc: "Collect cash on delivery" },
                      { value: "online", label: "Pay Online", icon: "🌐", desc: "Pay online now or later" },
                      { value: "check", label: "Check", icon: "💳", desc: "Pay by check" },
                      { value: "charged", label: "Charged", icon: "📝", desc: "No payment collected - bill to account" },
                    ].map((opt) => {
                      const active = paymentMethod === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className={`relative cursor-pointer rounded-lg border p-3 flex flex-col justify-between text-left transition shadow-sm hover:shadow-md text-sm ${
                            active ? "border-blue-600 ring-2 ring-blue-500 bg-blue-50" : "border-gray-300 bg-white"
                          }`}
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
                            <span className="text-lg mr-2" aria-hidden>
                              {opt.icon}
                            </span>
                            <span className="font-semibold text-gray-800">{opt.label}</span>
                          </div>
                          <p className="text-gray-600 text-xs leading-snug line-clamp-2">{opt.desc}</p>
                          {active && (
                            <span className="absolute top-2 right-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  
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
