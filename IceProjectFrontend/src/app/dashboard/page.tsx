import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import Link from "next/link";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600 mt-1">Welcome to your customer portal. Manage your orders, view invoices, and update payment preferences.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📦</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
                <p className="text-sm text-gray-600">3 orders this month</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">💰</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Total Spent</h3>
                <p className="text-sm text-gray-600">$1,245.67</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📋</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Pending Invoices</h3>
                <p className="text-sm text-gray-600">2 unpaid invoices</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">⭐</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Account Status</h3>
                <p className="text-sm text-gray-600">Good standing</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/customer/new-order" className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors block">
              <div className="flex items-center justify-center space-x-2">
                <span>🛒</span>
                <span>Place New Order</span>
              </div>
            </Link>
            <Link href="/customer/invoices" className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors block">
              <div className="flex items-center justify-center space-x-2">
                <span>📄</span>
                <span>View Invoices</span>
              </div>
            </Link>
            <Link href="/customer/invoices" className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors block">
              <div className="flex items-center justify-center space-x-2">
                <span>💳</span>
                <span>Payment Settings</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="divide-y divide-gray-200">
              <div className="p-4 flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm">📦</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Order #ORD-2024-001 placed</p>
                  <p className="text-xs text-gray-500">2 days ago</p>
                </div>
                <div className="text-sm text-gray-600">$234.56</div>
              </div>
              
              <div className="p-4 flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">💰</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Payment received for Invoice #INV-2024-003</p>
                  <p className="text-xs text-gray-500">5 days ago</p>
                </div>
                <div className="text-sm text-gray-600">$567.89</div>
              </div>
              
              <div className="p-4 flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 text-sm">📋</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Invoice #INV-2024-004 generated</p>
                  <p className="text-xs text-gray-500">1 week ago</p>
                </div>
                <div className="text-sm text-gray-600">$445.23</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}