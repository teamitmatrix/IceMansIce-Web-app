"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FileText,
  Printer,
  ExternalLink,
  Check,
} from "lucide-react";
import axios from "@/lib/axios";
import { buildEscPosInvoice } from "@/lib/escpos";
import { sendToBluetoothPrinter } from "@/lib/bluetoothPrinter";

interface InvoiceItem {
  productName?: string;
  name?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate?: number;
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
    address: {
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
  status: string;
  invoiceDate?: string; // may not exist
  createdAt?: string;
  isPrinted: boolean;
  paymentMethod?: string;
  salesOrderId?: {
    _id: string;
    poNumber?: string;
    paymentTerms: string;
  };

  notes?: string;
}

export default function CustomerInvoiceDetail() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (invoiceId) fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const response = await axios.get(`/customer-portal/invoices/${invoiceId}`);
      setInvoice(response.data.invoice || response.data);
      console.log(response.data);
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
      await axios.put(`/customer-portal/invoices/${invoiceId}/print`);
      window.print();
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

      const address = invoice.customerId?.address ? [
        invoice.customerId.address.street,
        invoice.customerId.address.city,
        invoice.customerId.address.state,
        invoice.customerId.address.zipCode
      ].filter(Boolean).join(', ') : '';
      
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
        items: invoice.items.map(it => ({ name: it.productName || it.name || 'Item', qty: it.quantity, unitPrice: it.unitPrice, total: it.lineTotal ?? (it.unitPrice * it.quantity - (it.discount || 0)) })),
        subtotal: invoice.subtotal,
        tax: invoice.taxAmount,
        total: invoice.total,
        poNumber: invoice.salesOrderId?.poNumber || 'N/A',
        paymentTerms: invoice.salesOrderId?.paymentTerms || 'N/A',
        footerNote: 'Thank you for your business!',
      });
      
      await sendToBluetoothPrinter(payload);
      
      // Mark as printed after successful BT print
      try { 
        await axios.put(`/customer-portal/invoices/${invoiceId}/print`); 
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const formatAddress = (address: Invoice["customerId"]["address"]) => {
    if (!address) return "No address provided";
    const parts = [address.street, address.city, address.state, address.zipCode].filter(Boolean);
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
      {/* Page Header */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex flex-col gap-2  md:flex-row items-center md:gap-0 justify-between">
            <div className="flex flex-col items-start md:flex-row md:items-center space-x-4">
              <Button
                onClick={() => router.back()}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Invoice #{invoice.invoiceNumber}
                </h1>
                <p className="text-gray-600 mt-1">Invoice details and printing options</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 print:hidden">
              {/* Status chip hidden as requested */}
              <Button
                onClick={() => {
                  const payUrl = new URL('https://pay.icemansice.com');
                  payUrl.searchParams.set('invoiceId', invoice._id);
                  payUrl.searchParams.set('amount', String(invoice.total));
                  window.open(payUrl.toString(), '_blank');
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" /> Pay Online
              </Button>
              <Button
                onClick={handleBluetoothPrint}
                disabled={printing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" /> BT Print
              </Button>
              <Button
                onClick={handlePrint}
                disabled={printing}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              >
                <Printer className="h-4 w-4 mr-2" />
                {printing ? "Printing..." : "Print Invoice"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div id="invoice-print" className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden print:shadow-none print:border-none">
        {/* Invoice Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Info */}
            <div>
              <h1 id="company-name" className="text-2xl font-bold text-gray-900 mb-2">Iceman's Ice Company LLC</h1>
              <p className="text-gray-600">
                501 Florida Central pkwy<br />
                Unit # 521952, Longwood, Florida 32752<br />
                Phone: 407-310-5007<br />
                Email: moe@icemansice.com
              </p>
            </div>

            {/* Invoice Info */}
            <div className="text-right " >
              <h3  className="text-xl font-semibold text-gray-900 mb-4 heading">Invoice Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between " >
                  <span className="text-gray-600 details">Invoice #:</span>
                  <span className="font-medium details">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 details">Date:</span>
                  <span className="font-medium details">{formatDate(invoice.invoiceDate || invoice.createdAt || '')}</span>
                </div>

                {invoice.paymentMethod && (
                 <div >
                  <div className="flex justify-between">
                    <span className="text-gray-600 details">Payment Method:</span>
                    <span className="font-medium flex items-center details">
                       {invoice.paymentMethod}
                    </span>
                  </div>
                 </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="p-6 border-b">
          <h3 id="bill-to" className="text-lg font-semibold text-gray-900 mb-4">Bill To:</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium text-gray-900">{invoice.customerId.name}</p>
            <p className="text-gray-600">{invoice.customerId.email}</p>
            <p className="text-gray-600">{invoice.customerId.phone}</p>
            <p className="text-gray-600 mt-2">{formatAddress(invoice.customerId.address)}</p>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="p-6">
          <h3 id="items" className="text-lg font-semibold text-gray-900 mb-4">Items:</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4">Product</th>
                  <th className="text-right py-3 px-4">Qty</th>
                  <th className="text-right py-3 px-4">Unit Price</th>
                  <th className="text-right py-3 px-4">Discount</th>
                  <th className="text-right py-3 px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium">{item.productName}</td>
                    <td className="py-3 px-4 text-right">{item.quantity}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(item?.discount)}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 border-t-2 border-gray-200 pt-4">

            <div>
              <p><span className="font-bold pr-2">PO Number:</span> {invoice.salesOrderId?.poNumber || 'N/A'}</p>

              <p><span className="font-bold pr-2">Payment Terms:</span> {invoice.salesOrderId?.paymentTerms || 'N/A'}</p>
            </div>
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span className="heading">Total:</span>
                  <span className="heading">{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 border-t">
          <div className="text-center text-gray-600 text-sm">
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
      <div className="mt-6 flex justify-center space-x-4 print:hidden">
        <Button
          onClick={() => router.push("/customer/orders")}
          variant="outline"
        >
          View All Orders
        </Button>
        <Button
          onClick={() => router.push("/customer")}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        >
          Back to Dashboard
        </Button>
      </div>
      {/* Print-only CSS to hide everything except the invoice container */}
      <style jsx global>{`
  @media print {
    /* Hide everything except invoice */
    body * { visibility: hidden; }
    #invoice-print, #invoice-print * { visibility: visible; }

    /* Invoice container */
    #invoice-print {
      position: absolute;
      left: 0;
      right: 0;
      top: 16px;
      width: 80mm; /* Thermal paper width */
      margin: 0 auto;
      box-shadow: none !important;
      border: none !important;
      page-break-inside: avoid;
      font-size: 10px !important;
      line-height: 1.6 !important;
    }

    /* Headings */
    #invoice-print h1, 
    #invoice-print h2, 
    #invoice-print h3 {
      margin-top: 0 !important;
      margin-bottom: 2px !important;
     
    }

    #company-name {
      font-size: 12px !important;
      text-align: center !important;
    }
    .heading {
      font-size: 12px !important;
    }

    .details{
    font-size: 10px !important;
    }

    #bill-to, #items {
      font-size: 10px !important;
      margin-bottom: 2px !important;
    }

    
        /* Remove outer boxes/padding before table */
#invoice-print > div {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
}


    /* Tables */
    #invoice-print table {
      width: 100% !important;
      table-layout: fixed;
      border-collapse: collapse;
    }

    #invoice-print th, #invoice-print td {
      padding: 2px 4px !important;
      font-size: 10px !important;
    }

    #invoice-print th {
      font-weight: 600;
    }

    /* Reduce padding in sections */
    #invoice-print .p-6 {
      padding: 4px !important;
    }

    #invoice-print .border-b {
      border-width: 1px !important;
    }

    /* Footer */
    #invoice-print .bg-gray-50 {
      padding: 4px !important;
    }

    /* Hide non-print elements */
    .print\\:hidden { display: none !important; }

    html, body { background: #fff !important; overflow: visible; }
    .not-visible{
      display: none !important;}
  }

  @page {
    size: 80mm auto;
    margin: 0;
  }
`}</style>

    </div>
  );
}