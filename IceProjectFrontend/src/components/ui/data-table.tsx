"use client";

import { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchFilterBar } from "./search-filter-bar";
import { Pagination } from "./pagination";
import {
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
} from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface DataTableProps<T> {
  title: string;
  description?: string;
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (itemsPerPage: number) => void;
  };
  search?: {
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
  };
  filters?: Array<{
    key: string;
    label: string;
    options: FilterOption[];
    value: string;
    onValueChange: (value: string) => void;
  }>;
  actions?: {
    onExport?: () => void;
    onAdd?: () => void;
    onView?: (item: T) => void;
    onEdit?: (item: T) => void;
    onDelete?: (item: T) => void;
  };
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  title,
  description,
  data,
  columns,
  loading = false,
  pagination,
  search,
  filters = [],
  actions = {},
  emptyMessage = "No data available",
  className = "",
}: DataTableProps<T>) {
  const { onExport, onAdd, onView, onEdit, onDelete } = actions;

  const renderCellContent = (item: T, column: Column<T>) => {
    if (column.render) {
      return column.render(item);
    }

    const value = item[column.key];

    // Handle different data types
    if (typeof value === "boolean") {
      return (
        <Badge
          className={
            value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }
        >
          {value ? "Yes" : "No"}
        </Badge>
      );
    }

    if (
      typeof value === "number" &&
      column.key.toLowerCase().includes("price")
    ) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
    }

    if (
      value instanceof Date ||
      (typeof value === "string" && !isNaN(Date.parse(value)))
    ) {
      return new Date(value).toLocaleDateString();
    }

    return value?.toString() || "N/A";
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>

          <div className="flex gap-2">
            {onExport && (
              <Button onClick={onExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            {onAdd && (
              <Button onClick={onAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filters */}
        {(search || filters.length > 0) && (
          <SearchFilterBar
            searchPlaceholder={search?.placeholder}
            searchValue={search?.value || ""}
            onSearchChange={search?.onChange || (() => {})}
            filters={filters}
            onClearFilters={() => {
              search?.onChange("");
              filters.forEach((filter) => filter.onValueChange(""));
            }}
          />
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {emptyMessage}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`text-left p-3 ${column.className || ""}`}
                    >
                      {column.label}
                    </th>
                  ))}
                  {(onView || onEdit || onDelete) && (
                    <th className="text-left p-3">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className="border-b hover:bg-gray-50"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`p-3 ${column.className || ""}`}
                      >
                        {renderCellContent(item, column)}
                      </td>
                    ))}
                    {(onView || onEdit || onDelete) && (
                      <td className="p-3">
                        <div className="flex gap-2">
                          {onView && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onView(item)}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {onEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onEdit(item)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onDelete(item)}
                              title="Delete"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={pagination.onPageChange}
            onItemsPerPageChange={pagination.onItemsPerPageChange}
          />
        )}
      </CardContent>
    </Card>
  );
}
