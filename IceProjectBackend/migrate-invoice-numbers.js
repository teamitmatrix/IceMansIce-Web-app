const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: mongoose.Schema.Types.Mixed, // Allow both string and number during migration
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  // ... other fields don't matter for this migration
}, { timestamps: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);

async function migrateInvoiceNumbers() {
  try {
    console.log('Starting invoice number migration...');
    
    // Find all invoices with string invoice numbers
    const stringInvoices = await Invoice.find({
      invoiceNumber: { $type: 'string' }
    });
    
    console.log(`Found ${stringInvoices.length} invoices with string numbers`);
    
    for (const invoice of stringInvoices) {
      let newNumber;
      
      if (typeof invoice.invoiceNumber === 'string') {
        // Extract number from "INV-000123" format
        const match = invoice.invoiceNumber.match(/INV-(\d+)/);
        if (match) {
          newNumber = parseInt(match[1], 10);
        } else {
          // Fallback: try to parse the string directly
          const parsed = parseInt(invoice.invoiceNumber, 10);
          newNumber = isNaN(parsed) ? 1 : parsed;
        }
      }
      
      if (newNumber) {
        console.log(`Migrating ${invoice.invoiceNumber} -> ${newNumber}`);
        await Invoice.updateOne(
          { _id: invoice._id },
          { $set: { invoiceNumber: newNumber } }
        );
      }
    }
    
    // Check for the highest number to ensure future generation works
    const highestInvoice = await Invoice.findOne().sort({ invoiceNumber: -1 });
    console.log(`Highest invoice number after migration: ${highestInvoice?.invoiceNumber || 'none'}`);
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

if (require.main === module) {
  migrateInvoiceNumbers();
}

module.exports = { migrateInvoiceNumbers };