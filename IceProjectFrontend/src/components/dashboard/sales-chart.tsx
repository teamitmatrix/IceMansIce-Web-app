"use client"

import { useEffect, useState } from "react"
import { Line } from "react-chartjs-2"
import api from "@/lib/axios"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface SalesData {
  labels: string[]
  data: number[]
}

export function SalesChart() {
  const [salesData, setSalesData] = useState<SalesData>({
    labels: [],
    data: [],
  })

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const response = await api.get("/admin/sales-chart")
        setSalesData(response.data)
      } catch (error) {
        console.error("Failed to fetch sales data:", error)
      }
    }

    fetchSalesData()
  }, [])

  const data = {
    labels: salesData.labels,
    datasets: [
      {
        label: "Sales",
        data: salesData.data,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.5)",
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Sales Over Time",
      },
    },
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <Line options={options} data={data} />
    </div>
  )
}
