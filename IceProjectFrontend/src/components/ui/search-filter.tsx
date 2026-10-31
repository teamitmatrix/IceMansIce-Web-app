"use client";

import { useState } from "react";
import { Search, Filter, X, Calendar, User, Package } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Select } from "./select";
import { Card } from "./card";

interface FilterOption {
  value: string;
  label: string;
}

interface DateRange {
  from: string;
  to: string;
}

interface SearchFilterProps {
  onSearch: (query: string) => void;
  onFilter: (filters: Record<string, any>) => void;
  onDateRange?: (dateRange: DateRange) => void;
  searchPlaceholder?: string;
  filters?: {
    status?: FilterOption[];
    user?: FilterOption[];
    product?: FilterOption[];
  };
  showDateRange?: boolean;
  showExport?: boolean;
  onExport?: () => void;
  className?: string;
}

export function SearchFilter({
  onSearch,
  onFilter,
  onDateRange,
  searchPlaceholder = "Search...",
  filters = {},
  showDateRange = false,
  showExport = false,
  onExport,
  className = "",
}: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
    {}
  );
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = {
      ...activeFilters,
      [key]: value,
    };
    setActiveFilters(newFilters);
    onFilter(newFilters);
  };

  const clearFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
    onFilter(newFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setDateRange({ from: "", to: "" });
    onFilter({});
    if (onDateRange) {
      onDateRange({ from: "", to: "" });
    }
  };

  const getActiveFilterCount = () => {
    let count = Object.keys(activeFilters).length;
    if (dateRange.from || dateRange.to) count++;
    return count;
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearch(e.target.value);
              }}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {getActiveFilterCount() > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {getActiveFilterCount()}
              </span>
            )}
          </Button>
          {showExport && (
            <Button variant="outline" onClick={onExport}>
              Export
            </Button>
          )}
        </div>

        {/* Active Filters */}
        {getActiveFilterCount() > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(activeFilters).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {filters[key as keyof typeof filters]?.find(
                  (f: FilterOption) => f.value === value
                )?.label || value}
                <button
                  onClick={() => clearFilter(key)}
                  className="ml-2 hover:text-blue-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {(dateRange.from || dateRange.to) && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                Date Range
                <button
                  onClick={() => {
                    setDateRange({ from: "", to: "" });
                    if (onDateRange) {
                      onDateRange({ from: "", to: "" });
                    }
                  }}
                  className="ml-2 hover:text-green-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              Clear All
            </Button>
          </div>
        )}

        {/* Filter Options */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            {/* Status Filter */}
            {filters.status && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <Select
                  value={activeFilters.status || ""}
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <option value="">All Statuses</option>
                  {filters.status.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Category Filter removed */}

            {/* User Filter */}
            {filters.user && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User
                </label>
                <Select
                  value={activeFilters.user || ""}
                  onValueChange={(value) => handleFilterChange("user", value)}
                >
                  <option value="">All Users</option>
                  {filters.user.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Product Filter */}
            {filters.product && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product
                </label>
                <Select
                  value={activeFilters.product || ""}
                  onValueChange={(value) =>
                    handleFilterChange("product", value)
                  }
                >
                  <option value="">All Products</option>
                  {filters.product.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Date Range Filter */}
            {showDateRange && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="date"
                      placeholder="From"
                      value={dateRange.from}
                      onChange={(e) => {
                        const newDateRange = {
                          ...dateRange,
                          from: e.target.value,
                        };
                        setDateRange(newDateRange);
                        if (onDateRange) {
                          onDateRange(newDateRange);
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="date"
                      placeholder="To"
                      value={dateRange.to}
                      onChange={(e) => {
                        const newDateRange = {
                          ...dateRange,
                          to: e.target.value,
                        };
                        setDateRange(newDateRange);
                        if (onDateRange) {
                          onDateRange(newDateRange);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
