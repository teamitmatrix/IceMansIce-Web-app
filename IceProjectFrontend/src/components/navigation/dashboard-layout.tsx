"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  notifications?: number;
  className?: string;
}

export function DashboardLayout({
  children,
  userRole = "customer",
  showSearch = true,
  searchPlaceholder = "Search...",
  onSearchChange,
  notifications = 0,
  className = "",
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const handleMenuToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  return (
    <div className={cn("min-h-screen bg-gray-50", className)}>
      <Sidebar userRole={userRole} />

      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}
      >
        <Topbar
          userRole={userRole}
          onMenuToggle={handleMenuToggle}
          showSearch={showSearch}
          searchPlaceholder={searchPlaceholder}
          onSearchChange={handleSearchChange}
          notifications={notifications}
        />

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
