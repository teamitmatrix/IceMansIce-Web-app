"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Search,
  Filter,
  Calendar,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
} from "lucide-react";

interface DateRange {
  from: string;
  to: string;
}

interface FilterOption {
  key: string;
  label: string;
  type: "select" | "text" | "number" | "date";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  min?: number;
  max?: number;
}

interface SortOption {
  key: string;
  label: string;
  direction: "asc" | "desc";
}

interface EnhancedSearchFilterProps {
  onSearch: (query: string) => void;
  onFilter: (filters: Record<string, any>) => void;
  onDateRange?: (range: DateRange) => void;
  onSort?: (sort: SortOption) => void;
  onExport?: (format: "csv" | "excel" | "pdf") => void;
  onRefresh?: () => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  sortOptions?: SortOption[];
  showDateRange?: boolean;
  showExport?: boolean;
  showRefresh?: boolean;
  className?: string;
  loading?: boolean;
}

export function EnhancedSearchFilter({
  onSearch,
  onFilter,
  onDateRange,
  onSort,
  onExport,
  onRefresh,
  searchPlaceholder = "Search...",
  filters = [],
  sortOptions = [],
  showDateRange = false,
  showExport = false,
  showRefresh = false,
  className = "",
  loading = false,
}: EnhancedSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSort, setSelectedSort] = useState<SortOption | null>(null);

  useEffect(() => {
    onSearch(searchQuery);
  }, [searchQuery, onSearch]);

  useEffect(() => {
    onFilter(activeFilters);
  }, [activeFilters, onFilter]);

  useEffect(() => {
    if (onDateRange) {
      onDateRange(dateRange);
    }
  }, [dateRange, onDateRange]);

  const handleFilterChange = (key: string, value: any) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilter = (key: string) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setDateRange({ from: "", to: "" });
    setSearchQuery("");
    setSelectedSort(null);
  };

  const handleSortChange = (sort: SortOption) => {
    setSelectedSort(sort);
    onSort?.(sort);
  };

  const getActiveFilterCount = () => {
    let count = Object.keys(activeFilters).length;
    if (dateRange.from || dateRange.to) count++;
    if (selectedSort) count++;
    return count;
  };

  const renderFilterInput = (filter: FilterOption) => {
    const value = activeFilters[filter.key] || "";

    switch (filter.type) {
      case "select":
        return (
          <Select
            value={value}
            onValueChange={(value) => handleFilterChange(filter.key, value)}
          >
            <option value="">All {filter.label}</option>
            {filter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        );

      case "number":
        return (
          <Input
            type="number"
            placeholder={filter.placeholder || `Enter ${filter.label}`}
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            min={filter.min}
            max={filter.max}
          />
        );

      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
          />
        );

      default:
        return (
          <Input
            type="text"
            placeholder={filter.placeholder || `Enter ${filter.label}`}
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
          />
        );
    }
  };

  return (
    <Card className={`p-4 ${className}`}>
      {/* Search Bar */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Filters Toggle */}
          {filters.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`relative ${
                getActiveFilterCount() > 0
                  ? "border-blue-500 text-blue-600"
                  : ""
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {getActiveFilterCount() > 0 && (
                <Badge className="ml-2 bg-blue-500 text-white text-xs">
                  {getActiveFilterCount()}
                </Badge>
              )}
              {showFilters ? (
                <ChevronUp className="w-4 h-4 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-2" />
              )}
            </Button>
          )}

          {/* Sort */}
          {sortOptions.length > 0 && (
            <Select
              value={
                selectedSort
                  ? `${selectedSort.key}-${selectedSort.direction}`
                  : ""
              }
              onValueChange={(value) => {
                const [key, direction] = value.split("-");
                const sort = sortOptions.find(
                  (s) => s.key === key && s.direction === direction
                );
                if (sort) handleSortChange(sort);
              }}
            >
              <option value="">Sort by...</option>
              {sortOptions.map((sort) => (
                <option
                  key={`${sort.key}-${sort.direction}`}
                  value={`${sort.key}-${sort.direction}`}
                >
                  {sort.label} ({sort.direction === "asc" ? "A-Z" : "Z-A"})
                </option>
              ))}
            </Select>
          )}

          {/* Refresh */}
          {showRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          )}

          {/* Export */}
          {showExport && onExport && (
            <Button variant="outline" size="sm" onClick={() => onExport("csv")}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Date Range */}
      {showDateRange && (
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Date Range:</span>
          </div>
          <Input
            type="date"
            placeholder="From"
            value={dateRange.from}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, from: e.target.value }))
            }
          />
          <span className="text-gray-400">to</span>
          <Input
            type="date"
            placeholder="To"
            value={dateRange.to}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, to: e.target.value }))
            }
          />
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && filters.length > 0 && (
        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  {filter.label}
                </Label>
                {renderFilterInput(filter)}
              </div>
            ))}
          </div>

          {/* Active Filters */}
          {getActiveFilterCount() > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Active filters:</span>
                  <div className="flex items-center space-x-2 flex-wrap">
                    {Object.entries(activeFilters).map(([key, value]) => {
                      const filter = filters.find((f) => f.key === key);
                      if (!filter || !value) return null;

                      return (
                        <Badge
                          key={key}
                          variant="secondary"
                          className="flex items-center space-x-1"
                        >
                          <span>
                            {filter.label}: {value}
                          </span>
                          <button
                            onClick={() => clearFilter(key)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    {(dateRange.from || dateRange.to) && (
                      <Badge
                        variant="secondary"
                        className="flex items-center space-x-1"
                      >
                        <span>
                          Date: {dateRange.from || "..."} to{" "}
                          {dateRange.to || "..."}
                        </span>
                        <button
                          onClick={() => setDateRange({ from: "", to: "" })}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                    {selectedSort && (
                      <Badge
                        variant="secondary"
                        className="flex items-center space-x-1"
                      >
                        <span>
                          Sort: {selectedSort.label} (
                          {selectedSort.direction === "asc" ? "A-Z" : "Z-A"})
                        </span>
                        <button
                          onClick={() => {
                            setSelectedSort(null);
                            onSort?.(null as any);
                          }}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Clear all
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
