"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
}

interface FilterOption {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

interface EnhancedDataTableProps<T> {
  title?: string;
  description?: string;
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onSearch?: (query: string) => void;
  onFilter?: (filters: Record<string, string>) => void;
  onSort?: (column: string, direction: "asc" | "desc") => void;
  onExport?: (format: "csv" | "excel") => void;
  filters?: FilterOption[];
  searchPlaceholder?: string;
  actions?: {
    create?: {
      label: string;
      onClick: () => void;
    };
    bulk?: {
      label: string;
      onClick: (selectedItems: T[]) => void;
    };
  };
  selectable?: boolean;
  onSelectionChange?: (selectedItems: T[]) => void;
  className?: string;
  toolbarExtras?: React.ReactNode;
}

export function EnhancedDataTable<T extends { _id: string }>({
  title,
  description,
  data,
  columns,
  loading = false,
  pagination,
  onPageChange,
  onLimitChange,
  onSearch,
  onFilter,
  onSort,
  onExport,
  filters = [],
  searchPlaceholder = "Search...",
  actions,
  selectable = false,
  onSelectionChange,
  className = "",
  toolbarExtras,
}: EnhancedDataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
    {}
  );
  const [selectedItems, setSelectedItems] = useState<T[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...activeFilters, [key]: value };
    setActiveFilters(newFilters);
    onFilter?.(newFilters);
  };

  const clearFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
    onFilter?.(newFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    onFilter?.({});
  };

  const handleSort = (column: string) => {
    const direction =
      sortColumn === column && sortDirection === "asc" ? "desc" : "asc";
    setSortColumn(column);
    setSortDirection(direction);
    onSort?.(column, direction);
  };

  const handleSelectAll = () => {
    if (selectedItems.length === data.length) {
      setSelectedItems([]);
      onSelectionChange?.([]);
    } else {
      setSelectedItems([...data]);
      onSelectionChange?.([...data]);
    }
  };

  const handleSelectItem = (item: T) => {
    const isSelected = selectedItems.some(
      (selected) => selected._id === item._id
    );
    let newSelection: T[];

    if (isSelected) {
      newSelection = selectedItems.filter(
        (selected) => selected._id !== item._id
      );
    } else {
      newSelection = [...selectedItems, item];
    }

    setSelectedItems(newSelection);
    onSelectionChange?.(newSelection);
  };

  const getActiveFilterCount = () => {
    let count = Object.keys(activeFilters).length;
    if (searchQuery) count++;
    return count;
  };

  const renderPagination = () => {
    if (!pagination || pagination.pages <= 1) return null;

    const { page, pages, total, limit } = pagination;
    const startItem = (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, total);

    console.log("Rendering pagination:", { page, pages, total, limit, startItem, endItem }); // Debug log

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-gray-700">
            Showing {startItem} to {endItem} of {total} results
          </p>
          <select
            value={limit.toString()}
            onChange={(e) => onLimitChange?.(parseInt(e.target.value))}
            className="ml-2 text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(1)}
            disabled={page === 1}
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              let pageNum: number;
              if (pages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= pages - 2) {
                pageNum = pages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange?.(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(page + 1)}
            disabled={page === pages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(pages)}
            disabled={page === pages}
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header */}
      {(title || description || actions || onExport) && (
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              )}
              {description && (
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {actions?.create && (
                <Button onClick={actions.create.onClick}>
                  {actions.create.label}
                </Button>
              )}

              {onExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExport("csv")}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

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
            </Button>
          )}
        </div>

        {toolbarExtras && (
          <div className="mt-4">
            {toolbarExtras}
          </div>
        )}

        {/* Filter Panel */}
        {showFilters && filters.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filters.map((filter) => (
                <div key={filter.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {filter.label}
                  </label>
                  <Select
                    value={activeFilters[filter.key] || ""}
                    onValueChange={(value) =>
                      handleFilterChange(filter.key, value)
                    }
                  >
                    <option value="">All {filter.label}</option>
                    {filter.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>

            {getActiveFilterCount() > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {Object.entries(activeFilters).map(([key, value]) => (
                    <Badge
                      key={key}
                      variant="secondary"
                      className="flex items-center space-x-1"
                    >
                      <span>
                        {filters.find((f) => f.key === key)?.label}: {value}
                      </span>
                      <button
                        onClick={() => clearFilter(key)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedItems.length === data.length && data.length > 0
                    }
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? "cursor-pointer hover:bg-gray-100" : ""
                  } ${column.className || ""}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronRight
                          className={`w-3 h-3 transform rotate-90 ${
                            sortColumn === column.key && sortDirection === "asc"
                              ? "text-blue-600"
                              : "text-gray-400"
                          }`}
                        />
                        <ChevronRight
                          className={`w-3 h-3 transform -rotate-90 ${
                            sortColumn === column.key &&
                            sortDirection === "desc"
                              ? "text-blue-600"
                              : "text-gray-400"
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-6 py-12 text-center"
                >
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No data available
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  {selectable && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.some(
                          (selected) => selected._id === item._id
                        )}
                        onChange={() => handleSelectItem(item)}
                        className="rounded border-gray-300"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-6 py-4 whitespace-nowrap ${
                        column.className || ""
                      }`}
                    >
                      {column.render
                        ? column.render((item as any)[column.key], item)
                        : (item as any)[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {renderPagination()}
    </Card>
  );
}
