"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import api from "@/lib/axios"
import { formatCurrency, formatDate } from "@/lib/utils"

interface Order {
  _id: string
  customerName: string
  total: number
  status: string
  createdAt: string
}

export function RecentOrders() {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await api.get("/orders?limit=5&sort=-createdAt")
        setOrders(response.data.orders)
      } catch (error) {
        console.error("Failed to fetch orders:", error)
      }
    }

    fetchOrders()
  }, [])

  return (
    <div className="rounded-lg border bg-white">
      <div className="p-4 border-b">
        <h3 className="text-lg font-medium">Recent Orders</h3>
      </div>
      <div className="divide-y">
        {orders.map((order) => (
          <Link
            key={order._id}
            href={`/customer/orders/${order._id}`}
            className="flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div>
              <p className="font-medium">{order.customerName}</p>
              <p className="text-sm text-gray-500">
                {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">{formatCurrency(order.total)}</p>
              <p
                className={`text-sm ${
                  order.status === "completed"
                    ? "text-green-600"
                    : "text-orange-600"
                }`}
              >
                {order.status}
              </p>
            </div>
          </Link>
        ))}
      </div>
      <div className="p-4 border-t">
        <Link
          href="/customer/orders"
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          View all orders
        </Link>
      </div>
    </div>
  )
}
