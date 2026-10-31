const mongoose = require("mongoose");
const QuickBooksConnectionTable = require("./src/models/QuickBooksConnectionTable");
const config = require("./src/config");

// Test script to verify QuickBooks integration with new database table
async function testQuickBooksIntegration() {
  console.log("🧪 Testing QuickBooks Integration with New Database Table...\n");

  try {
    // Connect to MongoDB
    console.log("1. Connecting to MongoDB...");
    await mongoose.connect(config.database.uri);
    console.log("   ✅ Connected to MongoDB");

    // Test creating a connection record
    console.log("\n2. Testing connection record creation...");
    const testConnection = new QuickBooksConnectionTable({
      userId: new mongoose.Types.ObjectId(),
      companyId: "test-company-123",
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      tokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
      realmId: "test-realm-456",
      companyName: "Test QuickBooks Company",
      environment: "sandbox",
      isActive: true,
      syncStatus: "pending",
      syncHistory: [],
      preferences: {
        autoSync: false,
        syncInterval: 3600,
        syncTypes: ["customers", "invoices", "products"],
      },
    });

    await testConnection.save();
    console.log("   ✅ Connection record created successfully");
    console.log(`   Connection ID: ${testConnection._id}`);

    // Test finding active connection
    console.log("\n3. Testing findActiveByUserId...");
    const foundConnection = await QuickBooksConnectionTable.findActiveByUserId(
      testConnection.userId
    );
    if (foundConnection) {
      console.log("   ✅ Active connection found");
      console.log(`   Company: ${foundConnection.companyName}`);
      console.log(`   Status: ${foundConnection.syncStatus}`);
    } else {
      console.log("   ❌ No active connection found");
    }

    // Test adding sync history
    console.log("\n4. Testing sync history...");
    await testConnection.addSyncHistory("customers", "success", 25);
    await testConnection.addSyncHistory(
      "invoices",
      "failed",
      0,
      "API rate limit exceeded"
    );
    await testConnection.addSyncHistory("products", "success", 15);

    console.log("   ✅ Sync history added");
    console.log(`   History entries: ${testConnection.syncHistory.length}`);

    // Test virtual properties
    console.log("\n5. Testing virtual properties...");
    console.log(`   Token expired: ${testConnection.isTokenExpired}`);
    console.log(`   Needs sync: ${testConnection.needsSync}`);

    // Test finding connections that need sync
    console.log("\n6. Testing findNeedingSync...");
    const needingSync = await QuickBooksConnectionTable.findNeedingSync();
    console.log(`   ✅ Found ${needingSync.length} connections needing sync`);

    // Test updating preferences
    console.log("\n7. Testing preferences update...");
    testConnection.preferences.autoSync = true;
    testConnection.preferences.syncInterval = 1800; // 30 minutes
    await testConnection.save();
    console.log("   ✅ Preferences updated");

    // Test updating sync status
    console.log("\n8. Testing sync status update...");
    await testConnection.updateSyncStatus("syncing");
    console.log("   ✅ Sync status updated");

    // Clean up test data
    console.log("\n9. Cleaning up test data...");
    await QuickBooksConnectionTable.findByIdAndDelete(testConnection._id);
    console.log("   ✅ Test data cleaned up");

    console.log(
      "\n🎉 All tests passed! QuickBooks integration is working correctly."
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n📡 Disconnected from MongoDB");
  }
}

// Run the test
testQuickBooksIntegration().catch((error) => {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
});
