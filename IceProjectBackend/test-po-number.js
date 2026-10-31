// Test script to verify PO Number field in QuickBooks invoice
const mongoose = require('mongoose');

// Read .env file manually
const fs = require('fs');
const path = require('path');
const envFiles = ['.env', '.env.local', '.env.email-setup'];
for (const envFile of envFiles) {
  const envPath = path.join(__dirname, envFile);
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim();
      }
    });
  }
}

const Invoice = require('./src/models/Invoice');
const QuickBooksService = require('./src/services/quickbooksService');

async function testPONumber() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find a recent invoice
    const invoice = await Invoice.findOne().sort({ createdAt: -1 }).lean();
    
    if (!invoice) {
      console.log('No invoices found');
      process.exit(0);
    }

    console.log('\n=== Invoice Details ===');
    console.log('Invoice Number:', invoice.invoiceNumber);
    console.log('Invoice ID:', invoice._id);
    console.log('PO Number in DB:', invoice.poNumber);
    console.log('PO Number type:', typeof invoice.poNumber);
    console.log('PO Number is empty:', !invoice.poNumber);
    console.log('PO Number || "N/A":', invoice.poNumber || "N/A");

    // Test the QuickBooks service
    const qbService = new QuickBooksService();
    
    // Check if we have a QB connection
    const QuickBooksConnection = require('./src/models/QuickBooksConnection');
    const connection = await QuickBooksConnection.findOne({ tenantId: invoice.tenantId });
    
    if (!connection) {
      console.log('\nNo QuickBooks connection found for tenant:', invoice.tenantId);
      process.exit(0);
    }

    console.log('\n=== QuickBooks Connection ===');
    console.log('Tenant ID:', connection.tenantId);
    console.log('Connected:', !!connection.accessToken);
    
    // If invoice has qboId, fetch it from QuickBooks to see actual fields
    if (invoice.qboId) {
      try {
        console.log('\n=== Fetching from QuickBooks ===');
        console.log('QBO ID:', invoice.qboId);
        
        const qbo = qbService.getQboClient(
          invoice.tenantId,
          connection.accessToken,
          connection.realmId,
          connection.refreshToken
        );
        
        const qbInvoice = await new Promise((resolve, reject) => {
          qbo.getInvoice(invoice.qboId, (err, inv) => {
            if (err) reject(err);
            else resolve(inv);
          });
        });
        
        console.log('\n=== QuickBooks Invoice Fields ===');
        console.log('All fields:', Object.keys(qbInvoice).join(', '));
        console.log('\nPO Number field in QB:', qbInvoice.PONumber);
        console.log('Customer PO field in QB:', qbInvoice.CustomerPO);
        console.log('ShipMethodRef:', qbInvoice.ShipMethodRef);
        console.log('CustomerMemo:', qbInvoice.CustomerMemo);
        
      } catch (error) {
        console.error('Error fetching from QuickBooks:', error.message);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testPONumber();
