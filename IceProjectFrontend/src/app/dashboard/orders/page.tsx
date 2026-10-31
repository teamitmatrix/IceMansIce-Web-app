"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Calendar, ShoppingCart, Plus } from "lucide-react";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

type DeliveryType = "standard delivery" | "refused delivery" | "no delivery needed" | "service call";

export default function PlaceOrder() {
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"delivery" | "product">("delivery");
  
  // Delivery tab state
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("standard delivery");
  const [specialInstructions, setSpecialInstructions] = useState("");
  
  // Product form state
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  const deliveryOptions: DeliveryType[] = [
    "standard delivery",
    "refused delivery", 
    "no delivery needed",
    "service call"
  ];

  useEffect(() => {
    // No longer need to fetch products
  }, []);

  const addProductToOrder = () => {
    if (!productName.trim() || quantity <= 0 || unitPrice <= 0) {
      return;
    }

    const newItem: OrderItem = {
      id: Date.now().toString(),
      productName: productName.trim(),
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice
    };

    setSelectedItems([...selectedItems, newItem]);
    
    // Reset form
    setProductName("");
    setQuantity(1);
    setUnitPrice(0);
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }
    
    setSelectedItems(selectedItems.map(item => 
      item.id === itemId
        ? { ...item, quantity: newQuantity, lineTotal: newQuantity * item.unitPrice }
        : item
    ));
  };

  const updatePrice = (itemId: string, newPrice: number) => {
    if (newPrice < 0) return;
    
    setSelectedItems(selectedItems.map(item => 
      item.id === itemId
        ? { ...item, unitPrice: newPrice, lineTotal: item.quantity * newPrice }
        : item
    ));
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== itemId));
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTax = () => {
    return 0; // Tax set to 0
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const submitOrder = async () => {
    if (selectedItems.length === 0) {
      alert("Please add at least one item to your order");
      return;
    }

    setSubmitting(true);
    try {
      const orderData = {
        items: selectedItems.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        specialInstructions: specialInstructions || undefined,
        deliveryType: deliveryType,
        requiresApproval: true
      };

      console.log('Submitting order data:', orderData);
      const response = await api.post("/orders", orderData);
      console.log('Order creation response:', response.data);
      const createdOrder = response.data.order;
      console.log('Created order:', createdOrder);
      console.log('Order ID for redirect:', createdOrder.id || createdOrder._id);
      
      // Redirect to invoice page with order data
  router.push(`/customer/invoices?orderId=${createdOrder.id || createdOrder._id}`);
    } catch (error: any) {
      console.error("Failed to submit order:", error);
      const message = error.response?.data?.message || "Failed to place order. Please try again.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="space-y-4 w-full max-w-md">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="text-center pb-6">
          <h2 className="text-3xl font-bold text-gradient-primary mb-2">Place New Order</h2>
          <p className="text-gray-600">Configure delivery options and select products for your order</p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "delivery" | "product")} className="w-full tab-container">
          <TabsList className="grid w-full grid-cols-2 bg-white/50 backdrop-blur-sm p-1 rounded-xl shadow-md mb-4 md:mb-6 tab-list-centered">
            <TabsTrigger 
              value="delivery" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 touch-target px-3 py-2 tab-trigger-constrained"
            >
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Delivery Options</span>
              <span className="sm:hidden">Delivery</span>
            </TabsTrigger>
            <TabsTrigger 
              value="product" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 touch-target px-3 py-2 tab-trigger-constrained"
            >
              <ShoppingCart className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Products</span>
              <span className="sm:hidden">Products</span>
            </TabsTrigger>
          </TabsList>

          <div className="order-layout-grid">
            <div className="order-main-content">
              <TabsContent value="delivery" className="mt-0">
                <Card className="card-gradient border-none shadow-xl animate-slide-up">
                  <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Calendar className="h-6 w-6 text-blue-600" />
                      Delivery Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="delivery-type">Delivery Type</Label>
                      <Select value={deliveryType} onValueChange={(value) => setDeliveryType(value as DeliveryType)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select delivery type" />
                        </SelectTrigger>
                        <SelectContent>
                          {deliveryOptions.map(option => (
                            <SelectItem key={option} value={option}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="special-instructions">Special Instructions</Label>
                      <Textarea
                        id="special-instructions"
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        rows={4}
                        placeholder="Any special delivery instructions, access codes, preferred delivery times, etc."
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="product" className="mt-0">
                <Card className="card-gradient border-none shadow-xl animate-slide-up">
                  <CardHeader className="bg-gradient-to-r from-green-500/10 to-blue-600/10 rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <ShoppingCart className="h-6 w-6 text-green-600" />
                      Add Products to Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Product Entry Form */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="product-name">Product Name</Label>
                        <Input
                          id="product-name"
                          placeholder="Enter product name..."
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                          className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="unit-price">Price per Unit ($)</Label>
                        <Input
                          id="unit-price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={unitPrice}
                          onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                          className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-center">
                      <Button
                        onClick={addProductToOrder}
                        disabled={!productName.trim() || quantity <= 0 || unitPrice <= 0}
                        className="btn-primary-gradient text-white border-none px-8 py-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Order
                      </Button>
                    </div>

                    {/* Selected Items List */}
                    {selectedItems.length > 0 && (
                      <div className="space-y-4">
                        <Separator />
                        <h4 className="text-md font-medium text-gray-900">Order Items</h4>
                        <div className="space-y-3">
                          {selectedItems.map(item => (
                            <Card key={item.id} className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 border border-blue-200/30 shadow-md">
                              <CardContent className="p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                                  <div className="flex-1">
                                    <h5 className="font-semibold text-gray-900">{item.productName}</h5>
                                    <p className="text-sm text-gray-600">Line Total: ${item.lineTotal.toFixed(2)}</p>
                                  </div>
                                  
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2">
                                      <Label htmlFor={`qty-${item.id}`} className="text-sm font-medium min-w-8">Qty:</Label>
                                      <Input
                                        id={`qty-${item.id}`}
                                        type="number"
                                        value={item.quantity}
                                        min="1"
                                        className="w-20 text-center"
                                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                                      />
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                      <Label htmlFor={`price-${item.id}`} className="text-sm font-medium min-w-12">Price ($):</Label>
                                      <Input
                                        id={`price-${item.id}`}
                                        type="number"
                                        value={item.unitPrice}
                                        min="0"
                                        step="0.01"
                                        className="w-24 text-center"
                                        onChange={(e) => updatePrice(item.id, parseFloat(e.target.value))}
                                      />
                                    </div>
                                    
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeItem(item.id)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedItems.length === 0 && (
                      <Alert className="bg-blue-50/50 border-blue-200/50">
                        <AlertDescription className="text-center text-gray-600">
                          📝 No products added yet - Use the form above to add products to your order!
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>

            {/* Order Summary */}
            <div className="order-sidebar">
              <Card className="order-summary-card lg:sticky lg:top-6 border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-600/10 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-responsive-lg">
                    🧾 Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 lg:p-6">
                  {selectedItems.length === 0 ? (
                    <Alert className="bg-blue-50/50 border-blue-200/50">
                      <AlertDescription className="text-center text-gray-600">
                        🛒 No items added yet - Start browsing products!
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="space-y-3 mb-4">
                        {selectedItems.map(item => (
                          <div key={item.id} className="flex justify-between items-center p-2 rounded-lg bg-white/50">
                            <div className="flex-1">
                              <p className="text-sm font-semibold">{item.productName}</p>
                              <p className="text-xs text-gray-600">
                                {item.quantity} × ${item.unitPrice.toFixed(2)}
                              </p>
                            </div>
                            <span className="font-bold text-green-600">
                              ${item.lineTotal.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-gray-700">
                          <span>Subtotal:</span>
                          <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                          <span>Tax (0%):</span>
                          <span className="font-semibold">${calculateTax().toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total:</span>
                          <span className="text-green-600">${calculateTotal().toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="mt-6">
                        <Card className="bg-gradient-to-r from-blue-50/80 to-purple-50/80 border-blue-200/30">
                          <CardContent className="p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              🚚 Delivery Summary
                            </h4>
                            <div className="delivery-type-badge inline-block mb-2">
                              {deliveryType.charAt(0).toUpperCase() + deliveryType.slice(1)}
                            </div>
                          </CardContent>
                        </Card>

                        <Button
                          onClick={submitOrder}
                          disabled={submitting || selectedItems.length === 0}
                          className="w-full mt-4 btn-primary-gradient text-white text-lg py-3 shadow-xl hover:shadow-2xl transition-all duration-300 border-none"
                          size="lg"
                        >
                          {submitting ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Placing Order...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              🚀 Place Order
                            </div>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}