"use client";

import { use, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import api from "@/lib/axios";
import { toast } from "sonner";

interface OrderUpdateModalProps {
  order: any;
  onClose: () => void;
  onUpdated: () => void;
  path: string;
}

export default function OrderUpdateModal({ order, path, onClose, onUpdated }: OrderUpdateModalProps) {
  const [status, setStatus] = useState(order.status || "pending");
  const [items, setItems] = useState(order.items || []);
  const [loading, setLoading] = useState(false);
useEffect(() => {
 console.log("Initial items:", order.items);
}, [order]);

  // Handle item price or tax change
  const handleItemChange = (index: number, field: "unitPrice" | "tax", value: number) => {
    const updatedItems = [...items];
    const item = updatedItems[index];

    if (field === "unitPrice") item.unitPrice = value;
    if (field === "tax") item.taxRate = value / 100; // store as 0–1 fraction

    const base = item.unitPrice * item.quantity - (item.discount || 0);
    const itemTax = base * (item.taxRate || 0);
    item.lineTotal = base + itemTax;
    item.taxAmount = itemTax;

    setItems(updatedItems);
  };

  //  Totals
  const subtotal = items.reduce((sum:any, i:any) => sum + (i.unitPrice * i.quantity - (i.discount || 0)), 0);
  const totalTax = items.reduce((sum:any, i:any) => sum + (i.taxRate*i.quantity*i.unitPrice || 0), 0);
  const total = subtotal + totalTax;

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        status,
        items: items.map((i: any) => ({
          productId: i.productId?._id || i.productId,
          unitPrice: i.unitPrice,
          // send taxRate as fraction (0-1)
          taxRate: i.taxRate || 0,
        })),
      };

      await api.put(`${path}${order._id || order.id}`, payload);
      toast.success("Order updated successfully");
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl relative">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Update Order #{order.orderNumber}</h2>
          <Button variant="ghost" onClick={onClose} className="text-xl leading-none">
            ×
          </Button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Order Status */}
          <div>
            <Label>Order Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Items Table */}
          <div>
            <Label>Order Items</Label>
            <div className="mt-2 border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="p-2">Product</th>
                    <th className="p-2">Quantity</th>
                    <th className="p-2">Unit Price</th>
                    <th className="p-2">Tax (%)</th>
                    <th className="p-2">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item:any, index:any) => (
                    <tr key={item._id} className="border-t">
                      <td className="p-2">{item.productName}</td>
                      <td className="p-2">{item.quantity}</td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={((item.taxRate || 0) * 100).toFixed(2)}
                          onChange={(e) =>
                            handleItemChange(index, "tax", parseFloat(e.target.value) || 0)
                          }
                          className="w-20"
                        />
                      </td>
                      <td className="p-2">{item.lineTotal?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="pt-3 border-t">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Tax:</span>
              <span>{totalTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base mt-1">
              <span>Total:</span>
              <span>{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 border-t p-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
