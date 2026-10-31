/**
 * Test Order Form Email Flow
 * 
 * This script tests the complete flow of:
 * 1. Retrieving admin email from Site Settings
 * 2. Sending order form emails to admin
 * 
 * Run: node test-order-email-flow.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const SiteSettings = require('./src/models/SiteSettings');
const { sendEmergencyOrderEmail, sendRegularOrderEmail } = require('./src/services/emailService');
const logger = require('./src/utils/logger');

async function testOrderEmailFlow() {
  try {
    // Connect to database
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Test 1: Get admin email from settings
    logger.info('\n=== Test 1: Retrieving Admin Email from Settings ===');
    const settings = await SiteSettings.getSettings();
    const adminEmail = settings.emailSettings?.orderFormsEmail || 'moe@icemansice.com';
    logger.info(`Admin email configured: ${adminEmail}`);

    // Test 2: Send emergency order email
    logger.info('\n=== Test 2: Sending Emergency Order Email ===');
    const emergencyOrderData = {
      companyName: 'Test Restaurant',
      contactPerson: 'John Doe',
      phone: '407-123-4567',
      email: 'john@testrestaurant.com',
      street: '123 Test Street',
      city: 'Orlando',
      state: 'FL',
      zip: '32801',
      dateOfRequest: new Date().toLocaleDateString(),
      preferredDeliveryTime: '10:00 AM - 12:00 PM',
      typeOfIce: 'Block Ice',
      quantityNeeded: '500 lbs',
      storageUnitNeeded: 'Yes',
      specialInstructions: 'Test email - Please ignore',
    };

    const emergencyResult = await sendEmergencyOrderEmail(emergencyOrderData, adminEmail);
    logger.info('Emergency order email sent successfully!', {
      emailId: emergencyResult.id,
      recipient: adminEmail,
    });

    // Test 3: Send regular order email
    logger.info('\n=== Test 3: Sending Regular Order Email ===');
    const regularOrderData = {
      name: 'Jane Smith',
      address: '456 Test Ave, Orlando, FL 32801',
      phone: '407-987-6543',
      email: 'jane@example.com',
      productType: 'Block Ice - 10lb',
      requestedDeliveryDay: 'Monday',
      additionalNotes: 'Test email - Please ignore',
    };

    const regularResult = await sendRegularOrderEmail(regularOrderData, adminEmail);
    logger.info('Regular order email sent successfully!', {
      emailId: regularResult.id,
      recipient: adminEmail,
    });

    // Test 4: Verify environment configuration
    logger.info('\n=== Test 4: Environment Configuration ===');
    logger.info('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✓ Set' : '✗ Not set');
    logger.info('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || 'Using default (onboarding@resend.dev)');

    logger.info('\n✅ All tests completed successfully!');
    logger.info('\n📧 Check the admin email inbox:', adminEmail);
    logger.info('📊 View delivery status at: https://resend.com/emails');

  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('\nDisconnected from MongoDB');
  }
}

// Run the test
testOrderEmailFlow();
