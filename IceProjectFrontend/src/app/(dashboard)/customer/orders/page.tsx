"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, DollarSign, Calendar } from 'lucide-react';
import OrderSummaryStats from '@/components/orders/OrderSummaryStats';

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  orderDate: string;
  paymentMethod: string;
  isPaidOnDelivery: boolean;
  isPaidOnline?: boolean;
  status?: string;
}

export default function CustomerOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(()=>{ fetchOrders(); /* eslint-disable-next-line */}, [page]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 25 };
      const res = await axios.get('/customer-portal/orders', { params });
      setOrders(res.data.orders || []);
      setPages(res.data.pagination?.pages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally { setLoading(false); }
  };

  const filtered = orders.filter(o => {
    if (!search) return true;
    const term = search.toLowerCase();
    return o.orderNumber?.toLowerCase().includes(term);
  });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US',{ style:'currency', currency:'USD'}).format(amount);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US',{ year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
  const paymentLabel = (m:string) => ({ cash:'Cash', online:'Online' }[m]||m);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-lg font-medium text-gray-700">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">My Orders</h1>
              <p className="text-gray-600 mt-1">View your recent orders</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPage(1);
                  fetchOrders();
                }}
              >
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/customer')}
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      {filtered.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Quick Summary</CardTitle></CardHeader>
          <CardContent>
            <OrderSummaryStats orders={orders} />
          </CardContent>
        </Card>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row gap-4 md:items-end mb-6">
        <div className="flex-1">
          <input value={search} onChange={e=>{setSearch(e.target.value); setPage(1);}} placeholder="Search orders..." className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={()=>{setSearch(''); setPage(1); fetchOrders();}}>Reset</Button>
          {/* New Order button removed as requested */}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <p className="text-red-800 font-medium">Error loading orders</p>
          <p className="text-red-600 mt-2">{error}</p>
          <Button onClick={fetchOrders} className="mt-4" variant="outline">Retry</Button>
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map(order => (
            <Card key={order.id} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{order.orderNumber}</h3>
                        <p className="text-sm text-gray-600 flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(order.orderDate)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                       {!order.total || order.total===0 ? <span className="text-gray-500">N/A</span> : <span className="font-semibold text-green-600">{formatCurrency(order.total)}</span>}
                      </div>
                      <Badge variant="outline">{paymentLabel(order.paymentMethod)}</Badge>
                      {order.isPaidOnDelivery && (
                        <Badge className="bg-orange-100 text-orange-800" variant="secondary">COD</Badge>
                      )}
                      {order.isPaidOnline && (
                        <Badge className="bg-blue-100 text-blue-800" variant="secondary">Online</Badge>
                      )}
                      {/* badge for status */}
                      {
                        order.status && (
                          <Badge className="bg-purple-100 text-purple-800" variant="secondary">{order.status}</Badge>
                        )
                      }
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button onClick={()=>router.push(`/customer/orders/${order.id}`)} variant="outline" size="sm">View</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-2">You haven't created any orders yet.</p>
            <p className="text-gray-500">Please contact your sales representative to place a new order.</p>
          </CardContent>
        </Card>
      )}

      {pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</Button>
          <span className="text-sm text-gray-600">Page {page} of {pages}</span>
          <Button variant="outline" disabled={page===pages} onClick={()=>setPage(p=>p+1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
