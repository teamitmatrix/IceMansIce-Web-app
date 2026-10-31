"use client";
interface OrderLike { total: number; isPaidOnDelivery?: boolean; isPaidOnline?: boolean; }
interface Props { orders: OrderLike[]; currency?: string; }

export function OrderSummaryStats({ orders, currency = 'USD' }: Props) {
  if (!orders || orders.length === 0) return null;

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US',{style:'currency', currency}).format(amount);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
        <div className="text-sm text-gray-600">Total Orders</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{formatCurrency(orders.reduce((s,o)=>s+o.total,0))}</div>
        <div className="text-sm text-gray-600">Total Value</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-orange-600">{orders.filter(o=>o.isPaidOnDelivery).length}</div>
        <div className="text-sm text-gray-600">COD Orders</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-indigo-600">{orders.filter(o=>o.isPaidOnline).length}</div>
        <div className="text-sm text-gray-600">Online Orders</div>
      </div>
    </div>
  );
}

export default OrderSummaryStats;
