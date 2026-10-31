require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('./src/models/Customer');

async function checkCustomerData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a recent customer (likely registered through website)
    const recentCustomers = await Customer.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log('\n=== RECENT CUSTOMERS ===\n');
    
    recentCustomers.forEach((customer, index) => {
      console.log(`Customer #${index + 1}:`);
      console.log(`  Name: ${customer.name || 'N/A'}`);
      console.log(`  Email: ${customer.email || 'N/A'}`);
      console.log(`  Phone: ${customer.phone || 'N/A'}`);
      console.log(`  Address: ${customer.address || 'N/A'}`);
      console.log(`  QBO ID: ${customer.qboId || 'Not Synced'}`);
      console.log(`  Created: ${customer.createdAt}`);
      console.log(`  User ID: ${customer.userId || 'N/A'}`);
      console.log('---');
    });

    // Check if any customers are missing data
    const customersWithoutEmail = await Customer.countDocuments({ email: { $exists: false } });
    const customersWithoutPhone = await Customer.countDocuments({ phone: { $exists: false } });
    const customersWithoutAddress = await Customer.countDocuments({ address: { $exists: false } });

    console.log('\n=== STATISTICS ===');
    console.log(`Total customers: ${await Customer.countDocuments()}`);
    console.log(`Customers without email: ${customersWithoutEmail}`);
    console.log(`Customers without phone: ${customersWithoutPhone}`);
    console.log(`Customers without address: ${customersWithoutAddress}`);

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCustomerData();
