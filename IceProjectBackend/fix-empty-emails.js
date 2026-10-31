/**
 * Migration script to fix empty email strings in User collection
 * This removes the email field from users that have empty string emails
 * so they work properly with the sparse unique index
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./src/config');

async function fixEmptyEmails() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.db.uri);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User');
    const Customer = mongoose.model('Customer');
    
    console.log('\n=== Fixing Users ===');
    // Find all users with empty string email or null email
    const usersWithEmptyEmail = await User.find({ 
      $or: [
        { email: '' },
        { email: null }
      ]
    });
    console.log(`Found ${usersWithEmptyEmail.length} users with empty/null email`);

    if (usersWithEmptyEmail.length > 0) {
      // Update all users with empty/null email to unset the email field (make it undefined)
      const userResult = await User.updateMany(
        { $or: [{ email: '' }, { email: null }] },
        { $unset: { email: "" } }
      );
      
      console.log(`Successfully updated ${userResult.modifiedCount} users`);
    }
    
    // Verify the fix
    const remainingEmptyUserEmails = await User.countDocuments({ 
      $or: [{ email: '' }, { email: null }]
    });
    console.log(`Remaining users with empty/null email: ${remainingEmptyUserEmails}`);
    
    // Show total users without email field
    const usersWithoutEmail = await User.countDocuments({ email: { $exists: false } });
    console.log(`Total users without email field (undefined): ${usersWithoutEmail}`);

    console.log('\n=== Fixing Customers ===');
    // Find all customers with empty string email or null email
    const customersWithEmptyEmail = await Customer.find({ 
      $or: [
        { email: '' },
        { email: null }
      ]
    });
    console.log(`Found ${customersWithEmptyEmail.length} customers with empty/null email`);

    if (customersWithEmptyEmail.length > 0) {
      // Update all customers with empty/null email to unset the email field (make it undefined)
      const customerResult = await Customer.updateMany(
        { $or: [{ email: '' }, { email: null }] },
        { $unset: { email: "" } }
      );
      
      console.log(`Successfully updated ${customerResult.modifiedCount} customers`);
    }
    
    // Verify the fix
    const remainingEmptyCustomerEmails = await Customer.countDocuments({ 
      $or: [{ email: '' }, { email: null }]
    });
    console.log(`Remaining customers with empty/null email: ${remainingEmptyCustomerEmails}`);
    
    // Show total customers without email field
    const customersWithoutEmail = await Customer.countDocuments({ email: { $exists: false } });
    console.log(`Total customers without email field (undefined): ${customersWithoutEmail}`);

  } catch (error) {
    console.error('Error fixing empty emails:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the migration
fixEmptyEmails()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
