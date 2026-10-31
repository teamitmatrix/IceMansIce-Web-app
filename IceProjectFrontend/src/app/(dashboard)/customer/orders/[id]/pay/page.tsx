"use client";
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, Globe2, ArrowLeft } from 'lucide-react';

interface OrderItem { productName?: string; name?: string; quantity: number; unitPrice: number; lineTotal?: number; }
interface Order { _id: string; orderNumber: string; items: OrderItem[]; subtotal: number; taxAmount: number; total: number; paymentMethod?: 'cash'|'online'; }

export default function CustomerOrderPayPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const inFlightRef = useRef(false);

  useEffect(() => { if(orderId){ fetchOrder(); } }, [orderId]);

  const fetchOrder = async () => {
    try {
      const res = await axios.get(`/customer-portal/orders/${orderId}`);
      setOrder(res.data.order || res.data);
    } catch (e:any) {
      setError(e.response?.data?.message || 'Failed to load order');
    } finally { setLoading(false); }
  };

  const createInvoice = async (paymentMethod?: 'cash'|'online') => {
    const payload: any = { orderId };
    if (paymentMethod) payload.paymentMethod = paymentMethod;
    const res = await axios.post('/customer-portal/invoices', payload);
    return res.data.invoice || res.data;
  };

  const handleCash = async () => {
    if(!order || processing || inFlightRef.current) return;
    setProcessing(true); inFlightRef.current = true; setError("");
    try {
      const invoice = await createInvoice('cash');
      router.push(`/customer/invoices/${invoice._id || invoice.id}`);
    } catch (e:any) {
      setError(e.response?.data?.message || 'Cash flow failed');
      setProcessing(false); inFlightRef.current = false;
    }
  };

  const handleOnline = async () => {
    if(!order || processing || inFlightRef.current) return;
    setProcessing(true); inFlightRef.current = true; setError("");
    try {
      const invoice = await createInvoice('online');
      router.push(`/customer/invoices/${invoice._id || invoice.id}`);
    } catch (e:any) {
      setError(e.response?.data?.message || 'Redirect failed');
      setProcessing(false); inFlightRef.current = false;
    }
  };

  if (loading) return <div className='p-6'>Loading order...</div>;
  if (error) return <div className='p-6 text-red-600'>{error}</div>;
  if (!order) return <div className='p-6'>Order not found.</div>;

  return (
    <div className='mx-auto max-w-2xl p-6'>
      <Button variant='outline' size='sm' onClick={() => router.back()} className='mb-4 flex items-center gap-2'>
        <ArrowLeft className='h-4 w-4'/> Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Pay for Order #{order.orderNumber}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='mb-4 text-sm text-gray-600'>
            Total Due: <span className='font-semibold'>${order.total.toFixed(2)}</span>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Button disabled={processing} onClick={handleCash} className='bg-green-600 hover:bg-green-700 flex items-center gap-2'>
              <DollarSign className='h-4 w-4'/> Cash
            </Button>
            <Button disabled={processing} onClick={handleOnline} className='bg-blue-600 hover:bg-blue-700 flex items-center gap-2'>
              <Globe2 className='h-4 w-4'/> Pay Online
            </Button>
          </div>
          {processing && <p className='mt-4 text-sm text-gray-500'>Processing...</p>}
        </CardContent>
      </Card>
    </div>
  );
}
