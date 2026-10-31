"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FileText,
  Printer,
  Download,
  Check,
  DollarSign,
  ExternalLink,
  Bluetooth
} from "lucide-react";
import axios from "@/lib/axios";
import { buildEscPosInvoice } from "@/lib/escpos";
import { sendToBluetoothPrinter } from "@/lib/bluetoothPrinter";

interface InvoiceItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
}

interface Invoice {
  _id: string;
  invoiceNumber: number;
  orderId: string;
  customerId: {
    name: string;
    email: string;
    phone: string;
    address: string | {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
  };
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: string;
  invoiceDate?: string; // may not exist
  createdAt?: string;
  isPrinted: boolean;
  paymentMethod?: string;
  checkNumber?: string;
  salesOrderId?: {
    _id: string;
    poNumber?: string;
    paymentTerms: string;
  };

  notes?: string;
}

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const response = await axios.get(`/driver/invoices/${invoiceId}`);
      console.log('Fetched invoice:', response.data);
      setInvoice(response.data);
      setLoading(false);
    } catch (err: any) {
      setError("Failed to load invoice details");
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!invoice) return;

    setPrinting(true);
    try {
      // Mark invoice as printed
      await axios.put(`/driver/invoices/${invoiceId}/print`);

      // Trigger browser print
      window.print();

      // Update local state
      setInvoice({ ...invoice, isPrinted: true });
    } catch (err: any) {
      setError("Failed to mark invoice as printed");
    } finally {
      setPrinting(false);
    }
  };

  const handleBluetoothPrint = async () => {
    if (!invoice) return;
    setPrinting(true);
    setError(""); // Clear any previous errors
    
    try {
      // Check if Web Bluetooth is supported
      if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
        throw new Error('Bluetooth printing is not supported on this device/browser. Please use Chrome on Android or a compatible browser.');
      }

      // Handle address - could be string or object
      let address = '';
      if (invoice.customerId?.address) {
        if (typeof invoice.customerId.address === 'string') {
          address = invoice.customerId.address;
        } else {
          address = [
            invoice.customerId.address.street,
            invoice.customerId.address.city,
            invoice.customerId.address.state,
            invoice.customerId.address.zipCode
          ].filter(Boolean).join(', ');
        }
      }
      
      const payload = buildEscPosInvoice({
        invoiceNumber: invoice.invoiceNumber,
        date: new Date(invoice.invoiceDate || invoice.createdAt || Date.now()).toLocaleString(),
        company: {
          name: "Iceman's Ice Company LLC",
          addressLines: [
            '501 Florida Central pkwy , Unit # 521952, Longwood, Florida 32752',
            'Email: moe@icemansice.com'
          ],
          phone: '407-310-5007'
        },
        customer: { name: invoice.customerId?.name, phone: invoice.customerId?.phone, email: invoice.customerId?.email, address },
        items: invoice.items.map(it => ({ name: it.productName, qty: it.quantity, unitPrice: it.unitPrice, total: it.lineTotal })),
        subtotal: invoice.subtotal,
        tax: invoice.taxAmount,
        total: invoice.total,
        poNumber: invoice.salesOrderId?.poNumber,
        paymentTerms: invoice.salesOrderId?.paymentTerms,
        footerNote: 'Thank you for your business!',
      });
      
      await sendToBluetoothPrinter(payload);
      
      // Mark as printed after successful BT print
      try { 
        await axios.put(`/driver/invoices/${invoiceId}/print`); 
        setInvoice({ ...invoice, isPrinted: true });
      } catch (markError) {
        console.error('Failed to mark invoice as printed:', markError);
        // Don't throw - printing succeeded, just logging failed
      }
      
    } catch (e: any) {
      console.error('Bluetooth print error:', e);
      let errorMessage = 'Bluetooth print failed';
      
      if (e?.message) {
        errorMessage = e.message;
      } else if (e?.name === 'NotFoundError') {
        errorMessage = 'No Bluetooth printer found. Please make sure your printer is turned on and paired.';
      } else if (e?.name === 'SecurityError') {
        errorMessage = 'Bluetooth access denied. Please check your browser permissions.';
      } else if (e?.name === 'NetworkError') {
        errorMessage = 'Connection to printer failed. Please ensure the printer is in range and powered on.';
      }
      
      setError(errorMessage);
    } finally {
      setPrinting(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoice) return;

    const confirmed = window.confirm(
      `Mark Invoice #${invoice.invoiceNumber} as paid?\n\nThis will set:\n- Status: Paid\n- Amount Paid: ${formatCurrency(invoice.total)}\n- Balance: $0.00`
    );

    if (!confirmed) return;

    try {
      setMarkingPaid(true);
      const response = await axios.put(`/driver/invoices/${invoiceId}/mark-paid`);
      
      // Update local invoice state with the response
      if (response.data.invoice) {
        setInvoice(response.data.invoice);
      } else {
        // Fallback: manually update if backend doesn't return updated invoice
        setInvoice({
          ...invoice,
          status: 'paid',
          amountPaid: invoice.total,
          balance: 0
        });
      }
      
      setError(""); // Clear any errors
    } catch (err: any) {
      console.error("Failed to mark invoice as paid:", err);
      const errorMsg = err.response?.data?.message || "Failed to mark invoice as paid";
      setError(errorMsg);
    } finally {
      setMarkingPaid(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatAddress = (address: Invoice['customerId']['address']) => {
    if (!address) return "No address provided";
    
    // If address is a string, return it directly
    if (typeof address === 'string') {
      return address.trim() || "No address provided";
    }
    
    // If address is an object, format it
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "No address provided";
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
            <p className="text-lg font-medium text-gray-700">Loading invoice...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-800 font-medium">Error loading invoice</p>
            <p className="text-red-600 mt-2">{error}</p>
            <Button onClick={() => router.back()} className="mt-4" variant="outline">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
      {/* Minimal Button Bar */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Button
          onClick={() => router.back()}
          variant="outline"
          size="sm"
          className="bg-white hover:bg-gray-50 border border-gray-300 p-2 h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleBluetoothPrint}
            disabled={printing}
            variant="outline"
            size="sm"
            className="bg-white hover:bg-gray-50 border border-gray-300 p-2 h-8 w-8"
          >
            <Bluetooth className="h-4 w-4" />
          </Button>
          <Button
            onClick={handlePrint}
            disabled={printing}
            variant="outline"
            size="sm"
            className="bg-white hover:bg-gray-50 border border-gray-300 p-2 h-8 w-8"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Invoice Content */}
      <div id="invoice-print" className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden print:shadow-none print:border-none">
        {/* Invoice Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Info */}
            <div>
              <h1 id="company-name" className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Iceman's Ice Company LLC</h1>
              <p className="text-sm sm:text-base text-gray-600">
                501 Florida Central pkwy<br />
                Unit # 521952, Longwood, Florida 32752<br />
                Phone: 407-310-5007<br />
                Email: moe@icemansice.com
              </p>
            </div>

            {/* Invoice Info */}
            <div className="md:text-right" >
              <h3  className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 heading">Invoice Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between md:justify-end gap-4" >
                  <span className="text-gray-600 details">Invoice #:</span>
                  <span className="font-medium details">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between md:justify-end gap-4">
                  <span className="text-gray-600 details">Date:</span>
                  <span className="font-medium details">{formatDate(invoice.invoiceDate || invoice.createdAt || '')}</span>
                </div>

                {invoice.paymentMethod && (
                 <div >
                  <div className="flex justify-between md:justify-end gap-4">
                    <span className="text-gray-600 details">Payment Method:</span>
                    <span className="font-medium flex items-center details">
                       {invoice.paymentMethod}
                    </span>
                  </div>
                  {invoice.paymentMethod === 'check' && invoice.checkNumber && (
                    <div className="flex justify-between md:justify-end gap-4 mt-2">
                      <span className="text-gray-600 details">Check Number:</span>
                      <span className="font-medium details">{invoice.checkNumber}</span>
                    </div>
                  )}
                 </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="p-4 sm:p-6 border-b">
          <h3 id="bill-to" className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Bill To:</h3>
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <p className="font-medium text-gray-900 text-sm sm:text-base">{invoice.customerId.name}</p>
            <p className="text-gray-600 text-sm">{invoice.customerId.email}</p>
            <p className="text-gray-600 text-sm">{invoice.customerId.phone}</p>
            <p className="text-gray-600 mt-2 text-sm whitespace-normal break-words">{formatAddress(invoice.customerId.address)}</p>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="p-4 sm:p-6">
          <h3 id="items" className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Items:</h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm">Product</th>
                    <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm">Qty</th>
                    <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm">Unit Price</th>
                    <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell">Discount</th>
                    <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm">{item.productName}</td>
                      <td className="py-3 px-2 sm:px-4 text-right text-xs sm:text-sm">{item.quantity}</td>
                      <td className="py-3 px-2 sm:px-4 text-right text-xs sm:text-sm">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 px-2 sm:px-4 text-right text-xs sm:text-sm hidden sm:table-cell">{formatCurrency(item.discount)}</td>
                      <td className="py-3 px-2 sm:px-4 text-right font-medium text-xs sm:text-sm">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="mt-6 border-t-2 border-gray-200 pt-4">

            <div className="text-sm sm:text-base mb-4">
              <p><span className="font-bold pr-2">PO Number:</span> {invoice.salesOrderId?.poNumber || 'N/A'}</p>

              <p><span className="font-bold pr-2">Payment Terms:</span> {invoice.salesOrderId?.paymentTerms || 'N/A'}</p>
            </div>
            <div className="flex justify-end">
              <div className="w-full sm:w-64 space-y-2">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg sm:text-xl font-bold border-t pt-2">
                  <span className="heading">Total:</span>
                  <span className="heading">{formatCurrency(invoice.total)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                  <span className="text-green-600 font-semibold">Amount Paid:</span>
                  <span className="text-green-600 font-semibold">
                    {formatCurrency(invoice.amountPaid || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-base sm:text-lg font-bold border-t pt-2">
                  <span className={invoice.balance > 0 ? "text-red-600" : "text-green-600"}>
                    Balance:
                  </span>
                  <span className={invoice.balance > 0 ? "text-red-600" : "text-green-600"}>
                    {formatCurrency(invoice.balance || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 sm:p-6 border-t">
          <div className="text-center text-gray-600 text-xs sm:text-sm">
            <p>Thank you for your business!</p>
            {invoice.notes && (
              <p className="mt-2 italic">{invoice.notes}</p>
            )}
            {invoice.isPrinted && (
              <div className="mt-4 flex items-center justify-center text-green-600 not-visible">
                <Check className="h-4 w-4 mr-1" />
                <span className="text-sm">Invoice has been printed</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3 sm:space-x-4 print:hidden">
        <Button
          onClick={() => router.push("/driver/orders")}
          variant="outline"
          className="w-full sm:w-auto"
        >
          View All Orders
        </Button>
        <Button
          onClick={() => router.push("/driver")}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 w-full sm:w-auto"
        >
          Back to Dashboard
        </Button>
      </div>
      {/* Print-only CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          body * {
            visibility: hidden;
          }

          #invoice-print,
          #invoice-print * {
            visibility: visible;
          }

          #invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          /* Remove all colors and backgrounds */
          #invoice-print * {
            color: black !important;
            background: white !important;
            border-color: black !important;
          }

          /* Remove gradients and colored backgrounds */
          #invoice-print .bg-gradient-to-r,
          #invoice-print .bg-blue-50,
          #invoice-print .bg-indigo-50,
          #invoice-print .bg-gray-50 {
            background: white !important;
          }

          /* Simple borders */
          #invoice-print table {
            border-collapse: collapse;
          }

          #invoice-print th,
          #invoice-print td {
            border: 1px solid black !important;
            padding: 8px !important;
          }

          /* Hide print buttons */
          button,
          .print\\:hidden {
            display: none !important;
          }

          /* Remove shadows and rounded corners */
          #invoice-print,
          #invoice-print * {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

    </div>
  );
}