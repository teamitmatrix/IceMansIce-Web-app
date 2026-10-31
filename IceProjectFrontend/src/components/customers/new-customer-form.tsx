"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import api from "@/lib/axios"

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.object({
    street: z.string().min(2, "Street is required"),
    city: z.string().min(2, "City is required"),
    stateZip: z.string().min(3, "State & ZIP is required"),
    country: z.string().optional(),
  }),
})

type CustomerFormData = z.infer<typeof customerSchema>

export function NewCustomerForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  })

  const onSubmit = async (data: CustomerFormData) => {
    try {
      setIsSubmitting(true)
      // Compose address string for backend
      const addr = data.address;
      const addressLine = [addr.street, addr.city, addr.stateZip, addr.country].filter((s): s is string => typeof s === 'string' && Boolean(s)).map(s => s.trim()).join(", ");
      await api.post("/customers", { ...data, address: addressLine });
      router.push("/admin/customers")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="w-full">
            <div className="space-y-2">
              <label htmlFor="street" className="block text-sm font-medium text-gray-700">Street Address *</label>
              <input id="street" type="text" {...register("address.street")} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              {errors.address?.street && (<p className="text-sm text-red-500">{errors.address.street.message}</p>)}
            </div>
            <div className="space-y-2">
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">City *</label>
              <input id="city" type="text" {...register("address.city")} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              {errors.address?.city && (<p className="text-sm text-red-500">{errors.address.city.message}</p>)}
            </div>
            <div className="space-y-2">
              <label htmlFor="stateZip" className="block text-sm font-medium text-gray-700">State & ZIP *</label>
              <input id="stateZip" type="text" {...register("address.stateZip")} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              {errors.address?.stateZip && (<p className="text-sm text-red-500">{errors.address.stateZip.message}</p>)}
            </div>
            <div className="space-y-2">
              <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country</label>
              <input id="country" type="text" {...register("address.country")} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Customer"}
          </button>
        </div>
      </form>
    </div>
  )
}
