const mongoose = require("mongoose");
const config = require("./src/config");
const quickbooksService = require("./src/services/quickbooksService");
const MongoDAL = require("./src/dal/MongoDAL");

// Test script to sync data with QuickBooks
async function testQuickBooksSync() {
  console.log("🔄 Testing QuickBooks Data Sync...\n");

  try {
    // Connect to database
    console.log("1. Connecting to database...");
    await mongoose.connect(config.database.uri);
    console.log("   ✅ Database connected");

    // Initialize DAL
    const dal = new MongoDAL("test-tenant");

    // Check if we have any QuickBooks connections
    console.log("\n2. Checking QuickBooks connections...");
    const QuickBooksConnection = require("./src/models/QuickBooksConnection");
    const connections = await QuickBooksConnection.find({ isActive: true });

    if (connections.length === 0) {
      console.log("   ⚠️  No active QuickBooks connections found.");
      console.log("   📋 To connect QuickBooks:");
      console.log("   1. Start your server: npm run dev");
      console.log("   2. Get a JWT token by logging in");
      console.log("   3. Call GET /qbo/oauth/start to begin OAuth flow");
      console.log("   4. Complete OAuth authorization in QuickBooks");
      return;
    }

    console.log(`   ✅ Found ${connections.length} active connection(s)`);

    // Test connection for each user
    for (const connection of connections) {
      console.log(`\n3. Testing connection for user: ${connection.userId}`);
      console.log(`   Company: ${connection.companyName}`);
      console.log(`   Environment: ${connection.environment}`);

      try {
        // Test OAuth status
        const status = await quickbooksService.getOAuthStatus(
          connection.userId
        );
        console.log(
          `   ✅ Connection status: ${
            status.connected ? "Connected" : "Disconnected"
          }`
        );

        if (status.connected) {
          console.log(`   Last sync: ${status.lastSync || "Never"}`);
          console.log(`   Token expires: ${status.expiresAt}`);

          // Test company info
          console.log("\n4. Testing QuickBooks API access...");
          try {
            const companyInfo = await quickbooksService.getCompanyInfo(
              connection.userId,
              connection.accessToken,
              connection.realmId
            );
            console.log(
              `   ✅ Company info retrieved: ${companyInfo.CompanyName}`
            );
            console.log(`   Company ID: ${companyInfo.Id}`);
          } catch (error) {
            console.log(`   ❌ Failed to get company info: ${error.message}`);
          }

          // Test customer sync
          console.log("\n5. Testing customer sync...");
          try {
            const syncResult = await quickbooksService.syncCustomersToQbo(
              connection.userId,
              dal
            );
            console.log(`   ✅ Customer sync completed:`);
            console.log(`   - Synced: ${syncResult.syncedCount}`);
            console.log(`   - Errors: ${syncResult.errorCount}`);
            console.log(`   - Total: ${syncResult.totalCustomers}`);
          } catch (error) {
            console.log(`   ❌ Customer sync failed: ${error.message}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Connection test failed: ${error.message}`);
      }
    }

    console.log("\n🎉 QuickBooks sync test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log("\n📊 Database connection closed");
  }
}

// Run the test
testQuickBooksSync().catch((error) => {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
});
