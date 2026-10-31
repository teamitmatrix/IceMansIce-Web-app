require('dotenv').config();
const { sendEmergencyOrderEmail, sendRegularOrderEmail } = require('./src/services/emailService');

async function testEmails() {
  try {
    // Test emergency order email
    const emergencyOrderData = {
      companyName: "Test Company",
      contactPerson: "John Doe",
      phone: "555-0123",
      email: "test@example.com",
      street: "123 Test St",
      city: "Testville",
      state: "TS",
      zip: "12345",
      dateOfRequest: new Date().toLocaleDateString(),
      preferredDeliveryTime: "ASAP",
      typeOfIce: "Block Ice",
      quantityNeeded: "500 lbs",
      storageUnitNeeded: "Yes",
      specialInstructions: "Test emergency order"
    };

    console.log('Testing emergency order email...');
    const emergencyResult = await sendEmergencyOrderEmail(emergencyOrderData, process.env.TEST_EMAIL);
    console.log('Emergency order email result:', emergencyResult);

    // Test regular order email
    const regularOrderData = {
      name: "Jane Smith",
      address: "456 Regular St, Testville, TS 12345",
      phone: "555-4567",
      email: "jane@example.com",
      productType: "Cube Ice",
      requestedDeliveryDay: "Tomorrow",
      additionalNotes: "Test regular order"
    };

    console.log('\nTesting regular order email...');
    const regularResult = await sendRegularOrderEmail(regularOrderData, process.env.TEST_EMAIL);
    console.log('Regular order email result:', regularResult);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testEmails();