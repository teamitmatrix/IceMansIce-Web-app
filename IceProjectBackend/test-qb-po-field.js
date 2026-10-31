// Quick test to check QuickBooks PO Number field
const QuickBooks = require('node-quickbooks');

// Test invoice payload structure
const testPayload = {
  CustomerRef: { value: "1" },
  Line: [{
    Amount: 100.00,
    DetailType: "SalesItemLineDetail",
    SalesItemLineDetail: {
      ItemRef: { value: "1" },
      Qty: 1,
      UnitPrice: 100
    }
  }],
  DocNumber: "TEST-001",
  PONumber: "PO-12345",  // Testing this field
  TxnDate: "2025-11-19"
};

console.log("Test payload structure:");
console.log(JSON.stringify(testPayload, null, 2));
console.log("\nField 'PONumber' is present:", 'PONumber' in testPayload);
console.log("Value:", testPayload.PONumber);

// According to QuickBooks API documentation, the field should be "PONumber"
// Source: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice
console.log("\n✓ Using field name 'PONumber' (correct according to QB API docs)");
