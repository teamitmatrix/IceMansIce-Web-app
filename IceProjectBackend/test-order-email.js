require('dotenv').config();
const { sendEmergencyOrderEmail } = require('./src/services/emailService');

async function testOrderEmail() {
  try {
    console.log('Environment:', {
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      BACKEND_URL: process.env.BACKEND_URL
    });

    const testOrder = {
      companyName: 'Test Company',
      contactPerson: 'John Doe',
      phone: '123-456-7890',
      email: 'icemansice@gmail.com',
      street: '123 Test St',
      city: 'Test City',
      state: 'FL',
      zip: '12345',
      dateOfRequest: new Date().toISOString(),
      preferredDeliveryTime: '2:00 PM',
      typeOfIce: 'Block Ice',
      quantityNeeded: '100 lbs',
      storageUnitNeeded: 'No',
      specialInstructions: 'This is a test order'
    };

    console.log('Sending test order email...');
    const result = await sendEmergencyOrderEmail(testOrder, 'icemansice@gmail.com');
    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Failed to send test order:', error);
    process.exit(1);
  }
}

testOrderEmail();