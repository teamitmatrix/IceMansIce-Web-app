"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar } from 'lucide-react';

interface OrderItem { productName?: string; name?: string; quantity: number; unitPrice: number; lineTotal?: number; }
interface Order { _id: string; orderNumber: string; items: OrderItem[]; subtotal: number; taxAmount: number; total: number; orderDate?: string; paymentMethod?: 'cash'|'online'; }

export default function CustomerOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => { if(orderId){ fetchOrder(); } }, [orderId]);

  const fetchOrder = async () => {
    try {
      const res = await axios.get(`/customer-portal/orders/${orderId}`);
      setOrder(res.data.order || res.data);
    } catch (e:any) {
      setError(e.response?.data?.message || 'Failed to load order');
    } finally { setLoading(false); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US',{ style:'currency', currency:'USD' }).format(amount);
  const formatDate = (d?: string) => d ? new Date(d).toLocaleString() : '';

  if (loading) return <div className='p-6'>Loading order...</div>;
  if (error) return <div className='p-6 text-red-600'>{error}</div>;
  if (!order) return <div className='p-6'>Order not found.</div>;

  return (
    <div className='mx-auto max-w-3xl p-6'>
      <Button variant='outline' size='sm' onClick={() => router.back()} className='mb-4 flex items-center gap-2'>
        <ArrowLeft className='h-4 w-4'/> Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Order #{order.orderNumber}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='mb-4 text-sm text-gray-600 flex items-center gap-2'>
            <Calendar className='h-4 w-4'/> <span>{formatDate(order.orderDate)}</span>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b-2 border-gray-200'>
                  <th className='text-left py-3 px-4'>Product</th>
                  <th className='text-right py-3 px-4'>Qty</th>
                  <th className='text-right py-3 px-4'>Unit Price</th>
                  <th className='text-right py-3 px-4'>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it, idx) => (
                  <tr key={idx} className='border-b border-gray-100'>
                    <td className='py-3 px-4 font-medium'>{it.productName || it.name || 'Item'}</td>
                    <td className='py-3 px-4 text-right'>{it.quantity}</td>
                    <td className='py-3 px-4 text-right'>{formatCurrency(it.unitPrice)}</td>
                    <td className='py-3 px-4 text-right font-medium'>{formatCurrency(it.lineTotal || it.unitPrice * it.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='mt-6 border-t-2 border-gray-200 pt-4 flex justify-end'>
            <div className='w-64 space-y-2'>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Subtotal:</span>
                <span className='font-medium'>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Tax:</span>
                <span className='font-medium'>{formatCurrency(order.taxAmount)}</span>
              </div>
              <div className='flex justify-between text-xl font-bold border-t pt-2'>
                <span>Total:</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Pay button removed as requested */}
        </CardContent>
      </Card>
    </div>
  );
}
