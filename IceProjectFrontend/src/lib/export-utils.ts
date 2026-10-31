/**
 * Utility functions for exporting data to various formats
 */

export interface ExportOptions {
  filename?: string;
  sheetName?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
}

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
  type?: "string" | "number" | "date" | "boolean";
}

/**
 * Convert data to CSV format
 */
export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn[],
  options: ExportOptions = {}
): string {
  const { includeHeaders = true, dateFormat = "YYYY-MM-DD" } = options;

  if (!data.length) return "";

  const rows: string[] = [];

  // Add headers
  if (includeHeaders) {
    const headers = columns.map((col) => `"${col.label}"`).join(",");
    rows.push(headers);
  }

  // Add data rows
  data.forEach((item) => {
    const values = columns.map((col) => {
      let value = (item as any)[col.key];

      // Apply custom formatting
      if (col.format) {
        value = col.format(value);
      } else {
        // Default formatting based on type
        switch (col.type) {
          case "date":
            if (value) {
              const date = new Date(value);
              value = date.toLocaleDateString();
            }
            break;
          case "number":
            value = value || 0;
            break;
          case "boolean":
            value = value ? "Yes" : "No";
            break;
          default:
            value = value || "";
        }
      }

      // Escape quotes and wrap in quotes
      const escapedValue = String(value).replace(/"/g, '""');
      return `"${escapedValue}"`;
    });

    rows.push(values.join(","));
  });

  return rows.join("\n");
}

/**
 * Download CSV file
 */
export function downloadCSV<T>(
  data: T[],
  columns: ExportColumn[],
  options: ExportOptions = {}
): void {
  const csv = exportToCSV(data, columns, options);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${options.filename || "export"}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Convert data to Excel format (using SheetJS library)
 * Note: This requires the xlsx library to be installed
 */
export async function exportToExcel<T>(
  _data: T[],
  _columns: ExportColumn[],
  _options: ExportOptions = {}
): Promise<void> {
  throw new Error(
    "Excel export is not available. Install 'xlsx' or export as CSV instead."
  );
}

/**
 * Convert data to PDF format (using jsPDF library)
 * Note: This requires the jspdf library to be installed
 */
export async function exportToPDF<T>(
  _data: T[],
  _columns: ExportColumn[],
  _options: ExportOptions = {}
): Promise<void> {
  throw new Error(
    "PDF export is not available. Install 'jspdf' and 'jspdf-autotable' or export as CSV instead."
  );
}

/**
 * Generic export function that handles multiple formats
 */
export async function exportData<T>(
  data: T[],
  columns: ExportColumn[],
  format: "csv" | "excel" | "pdf",
  options: ExportOptions = {}
): Promise<void> {
  switch (format) {
    case "csv":
      downloadCSV(data, columns, options);
      break;
    case "excel":
      await exportToExcel(data, columns, options);
      break;
    case "pdf":
      await exportToPDF(data, columns, options);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Common column definitions for different data types
 */
export const commonColumns = {
  product: [
    { key: "name", label: "Product Name", type: "string" as const },
    { key: "sku", label: "SKU", type: "string" as const },
    {
      key: "price",
      label: "Price",
      type: "number" as const,
  format: (value: number) => `$${Number(value ?? 0).toFixed(2)}`,
    },
    { key: "quantity", label: "Quantity", type: "number" as const },
    {
      key: "tax",
      label: "Tax Rate",
      type: "number" as const,
  format: (value: number) => `${Number((value ?? 0) * 100).toFixed(1)}%`,
    },
    { key: "isActive", label: "Active", type: "boolean" as const },
    { key: "createdAt", label: "Created Date", type: "date" as const },
  ],

  order: [
    { key: "orderNumber", label: "Order Number", type: "string" as const },
    { key: "customerName", label: "Customer", type: "string" as const },
    {
      key: "total",
      label: "Total",
      type: "number" as const,
  format: (value: number) => `$${Number(value ?? 0).toFixed(2)}`,
    },
    { key: "status", label: "Status", type: "string" as const },
    { key: "orderDate", label: "Order Date", type: "date" as const },
    { key: "createdAt", label: "Created Date", type: "date" as const },
  ],

  invoice: [
    { key: "invoiceNumber", label: "Invoice Number", type: "number" as const },
    { key: "customerName", label: "Customer", type: "string" as const },
    {
      key: "total",
      label: "Total",
      type: "number" as const,
  format: (value: number) => `$${Number(value ?? 0).toFixed(2)}`,
    },
    {
      key: "amountPaid",
      label: "Amount Paid",
      type: "number" as const,
  format: (value: number) => `$${Number(value ?? 0).toFixed(2)}`,
    },
    { key: "status", label: "Status", type: "string" as const },
    { key: "issueDate", label: "Issue Date", type: "date" as const },
    { key: "dueDate", label: "Due Date", type: "date" as const },
  ],

  customer: [
    { key: "name", label: "Name", type: "string" as const },
    { key: "email", label: "Email", type: "string" as const },
    { key: "phone", label: "Phone", type: "string" as const },
    { key: "address", label: "Address", type: "string" as const },
    {
      key: "balance",
      label: "Balance",
      type: "number" as const,
  format: (value: number) => `$${Number(value ?? 0).toFixed(2)}`,
    },
    { key: "paymentTerms", label: "Payment Terms", type: "string" as const },
    { key: "isActive", label: "Active", type: "boolean" as const },
    { key: "createdAt", label: "Created Date", type: "date" as const },
  ],

  user: [
    { key: "name", label: "Name", type: "string" as const },
    { key: "email", label: "Email", type: "string" as const },
    { key: "phone", label: "Phone", type: "string" as const },
    { key: "role", label: "Role", type: "string" as const },
    { key: "isActive", label: "Active", type: "boolean" as const },
    { key: "lastLogin", label: "Last Login", type: "date" as const },
    { key: "createdAt", label: "Created Date", type: "date" as const },
  ],
};
