"use client"

import { useEffect, useState } from "react"
import api from "@/lib/axios"
import { formatCurrency } from "@/lib/utils"

interface Stats {
  totalOrders: number
  totalSales: number
  totalCustomers: number
  totalProducts: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalSales: 0,
    totalCustomers: 0,
    totalProducts: 0,
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/admin/stats")
        setStats(response.data)
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border p-4 bg-white">
        <div className="text-sm font-medium text-gray-500">Total Orders</div>
        <div className="mt-2 text-3xl font-semibold">{stats.totalOrders}</div>
      </div>
      <div className="rounded-lg border p-4 bg-white">
        <div className="text-sm font-medium text-gray-500">Total Sales</div>
        <div className="mt-2 text-3xl font-semibold">
          {formatCurrency(stats.totalSales)}
        </div>
      </div>
      <div className="rounded-lg border p-4 bg-white">
        <div className="text-sm font-medium text-gray-500">Total Customers</div>
        <div className="mt-2 text-3xl font-semibold">{stats.totalCustomers}</div>
      </div>
      <div className="rounded-lg border p-4 bg-white">
        <div className="text-sm font-medium text-gray-500">Total Products</div>
        <div className="mt-2 text-3xl font-semibold">{stats.totalProducts}</div>
      </div>
    </div>
  )
}
