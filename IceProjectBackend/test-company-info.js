const mongoose = require("mongoose");
const config = require("./src/config");
const quickbooksService = require("./src/services/quickbooksService");

// Test script to verify company info retrieval
async function testCompanyInfo() {
  console.log("🏢 Testing QuickBooks Company Info Retrieval...\n");

  try {
    // Connect to database
    console.log("1. Connecting to database...");
    await mongoose.connect(config.database.uri);
    console.log("   ✅ Database connected");

    // Check for QuickBooks connections
    console.log("\n2. Checking QuickBooks connections...");
    const QuickBooksConnection = require("./src/models/QuickBooksConnection");
    const connections = await QuickBooksConnection.find({ isActive: true });

    if (connections.length === 0) {
      console.log("   ⚠️  No active QuickBooks connections found.");
      console.log("   📋 You need to complete the OAuth flow first.");
      return;
    }

    console.log(`   ✅ Found ${connections.length} active connection(s)`);

    // Test company info for each connection
    for (const connection of connections) {
      console.log(`\n3. Testing company info for: ${connection.companyName}`);
      console.log(`   User ID: ${connection.userId}`);
      console.log(`   Realm ID: ${connection.realmId}`);
      console.log(`   Environment: ${connection.environment}`);

      try {
        // Test company info retrieval
        const companyInfo = await quickbooksService.getCompanyInfo(
          connection.userId,
          connection.accessToken,
          connection.realmId
        );

        console.log("   ✅ Company info retrieved successfully!");
        console.log(`   Company Name: ${companyInfo.CompanyName}`);
        console.log(`   Company ID: ${companyInfo.Id}`);
        console.log(`   Legal Name: ${companyInfo.LegalName || "N/A"}`);
        console.log(`   Country: ${companyInfo.Country || "N/A"}`);
        console.log(`   Currency: ${companyInfo.CurrencyRef?.value || "N/A"}`);
      } catch (error) {
        console.log(`   ❌ Failed to get company info: ${error.message}`);

        // Check if it's an authorization issue
        if (error.message.includes("ApplicationAuthorizationFailed")) {
          console.log("   💡 This might be due to:");
          console.log("   - App not authorized for this company");
          console.log("   - Wrong environment (sandbox vs production)");
          console.log("   - Company ID mismatch");
        }
      }
    }

    console.log("\n🎉 Company info test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log("\n📊 Database connection closed");
  }
}

// Run the test
testCompanyInfo().catch((error) => {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
});
