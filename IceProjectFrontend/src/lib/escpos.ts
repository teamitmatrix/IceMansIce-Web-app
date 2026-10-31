// Minimal ESC/POS utilities to build a printable invoice payload
// Note: Many thermal printers accept UTF-8 text for basic ASCII; emoji or complex scripts may not render.

export type InvoiceForPrint = {
  invoiceNumber: number;
  date?: string;
  customer?: { name?: string; phone?: string; email?: string; address?: string };
  items: Array<{ name: string; qty: number; unitPrice: number; total: number }>;
  subtotal: number;
  tax: number;
  total: number;
  poNumber?: string;
  paymentTerms?: string;
  footerNote?: string;
  company?: { name?: string; addressLines?: string[]; phone?: string };
};

const enc = new TextEncoder();

// ESC/POS command helpers
const ESC = 0x1b;
const GS = 0x1d;

function cmd(...bytes: number[]) { return new Uint8Array(bytes); }
function txt(s: string) { return enc.encode(s); }

function concat(chunks: Uint8Array[]): Uint8Array {
  const len = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

function align(mode: 'left' | 'center' | 'right') {
  const m = mode === 'left' ? 0 : mode === 'center' ? 1 : 2;
  return cmd(ESC, 0x61, m);
}

function bold(on: boolean) { return cmd(ESC, 0x45, on ? 1 : 0); }
function doubleSize(on: boolean) { return cmd(GS, 0x21, on ? 0x11 : 0x00); }
function feed(n: number) { return cmd(ESC, 0x64, Math.max(0, Math.min(255, n))); }
function hr(width = 32) { return txt('-'.repeat(width) + '\n'); }
function cut() { return cmd(GS, 0x56, 0x41, 0x10); } // partial cut where supported

function formatMoney(n: number) {
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}

// Build a fixed-width line with right-aligned amount
function lineItem(name: string, qty: number, unit: number, total: number, width = 32): string {
  const qtyStr = String(qty);
  const unitStr = formatMoney(unit);
  const totalStr = formatMoney(total);
  // Example layout: "Name xQty @Unit .... Total"
  const left = `${name} x${qtyStr} @${unitStr}`;
  const spaces = Math.max(1, width - left.length - totalStr.length);
  return left + ' '.repeat(spaces) + totalStr + '\n';
}

export function buildEscPosInvoice(data: InvoiceForPrint): Uint8Array {
  const chunks: Uint8Array[] = [];

  // Init - Reset printer to default state
  chunks.push(cmd(ESC, 0x40)); // ESC @ - Initialize printer
  
  // Set character code table to USA (for better compatibility)
  chunks.push(cmd(ESC, 0x74, 0)); // ESC t 0 - USA character set
  
  // Set international character set to USA
  chunks.push(cmd(ESC, 0x52, 0)); // ESC R 0 - USA international set

  // Header
  chunks.push(align('center'));
  chunks.push(doubleSize(true));
  chunks.push(bold(true));
  chunks.push(txt((data.company?.name || 'Invoice') + '\n'));
  chunks.push(doubleSize(false));
  chunks.push(bold(false));
  
  if (data.company?.addressLines?.length) {
    for (const l of data.company.addressLines) {
      // Wrap long lines
      const wrapped = wrapText(l, 32);
      for (const line of wrapped) {
        chunks.push(txt(line + '\n'));
      }
    }
  }
  if (data.company?.phone) chunks.push(txt(`Tel: ${data.company.phone}\n`));
  chunks.push(feed(1));

  chunks.push(txt(`Invoice #: ${data.invoiceNumber}\n`));
  if (data.date) chunks.push(txt(`Date: ${data.date}\n`));
  chunks.push(feed(1));
  chunks.push(hr());

  // Customer
  if (data.customer) {
    chunks.push(align('left'));
    chunks.push(bold(true));
    chunks.push(txt('BILL TO:\n'));
    chunks.push(bold(false));
    if (data.customer.name) chunks.push(txt(`${data.customer.name}\n`));
    if (data.customer.phone) chunks.push(txt(`Phone: ${data.customer.phone}\n`));
    if (data.customer.email) {
      const emailWrapped = wrapText(data.customer.email, 32);
      for (const line of emailWrapped) {
        chunks.push(txt(`${line}\n`));
      }
    }
    if (data.customer.address) {
      const addrWrapped = wrapText(data.customer.address, 32);
      for (const line of addrWrapped) {
        chunks.push(txt(`${line}\n`));
      }
    }
    chunks.push(feed(1));
    chunks.push(hr());
  }

  // Items header
  chunks.push(align('left'));
  chunks.push(bold(true));
  chunks.push(txt('ITEMS:\n'));
  chunks.push(bold(false));
  
  // Items
  for (const it of data.items) {
    chunks.push(txt(lineItem(it.name, it.qty, it.unitPrice, it.total)));
  }
  chunks.push(hr());

  // Totals
  const totalsWidth = 32;
  const subtotalStr = `Subtotal:`;
  const subtotalVal = formatMoney(data.subtotal);
  chunks.push(txt(subtotalStr + ' '.repeat(Math.max(1, totalsWidth - subtotalStr.length - subtotalVal.length)) + subtotalVal + '\n'));
  const taxStr = `Tax:`;
  const taxVal = formatMoney(data.tax);
  chunks.push(txt(taxStr + ' '.repeat(Math.max(1, totalsWidth - taxStr.length - taxVal.length)) + taxVal + '\n'));
  chunks.push(hr());
  
  const totalStr = `TOTAL:`;
  const totalVal = formatMoney(data.total);
  chunks.push(bold(true));
  chunks.push(doubleSize(true));
  chunks.push(txt(totalStr + ' '.repeat(Math.max(1, totalsWidth - totalStr.length - totalVal.length)) + totalVal + '\n'));
  chunks.push(doubleSize(false));
  chunks.push(bold(false));

  // Add PO Number and Payment Terms
  if (data.poNumber || data.paymentTerms) {
    chunks.push(feed(1));
    chunks.push(hr());
    
    if (data.poNumber) {
      chunks.push(txt(`PO Number: ${data.poNumber}\n`));
    }
    
    if (data.paymentTerms) {
      chunks.push(txt(`Payment Terms: ${data.paymentTerms}\n`));
    }
  }

  chunks.push(feed(2));
  chunks.push(align('center'));
  chunks.push(txt((data.footerNote || 'Thank you for your business!') + '\n'));
  chunks.push(feed(3));
  
  // Cut paper (if supported)
  chunks.push(cut());
  
  // Add extra line feeds to ensure paper feeds out
  chunks.push(feed(2));

  return concat(chunks);
}

// Helper function to wrap text to specified width
function wrapText(text: string, width: number): string[] {
  if (text.length <= width) return [text];
  
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine.length > 0 ? ' ' : '') + word;
    } else {
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  return lines;
}
