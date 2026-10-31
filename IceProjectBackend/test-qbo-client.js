const quickbooksService = require("./src/services/quickbooksService");
const config = require("./src/config");

// Test script to verify QuickBooks client creation
async function testQboClient() {
  console.log("🔧 Testing QuickBooks Client Creation...\n");

  try {
    // Test client creation with mock data
    const mockAccessToken = "mock_access_token_123";
    const mockRealmId = "mock_realm_id_456";
    const mockRefreshToken = "mock_refresh_token_789";

    console.log("1. Testing QuickBooks client creation...");
    console.log(
      `   Client ID: ${config.quickbooks.clientId?.substring(0, 8)}...`
    );
    console.log(`   Environment: ${config.quickbooks.environment}`);
    console.log(`   Access Token: ${mockAccessToken.substring(0, 20)}...`);
    console.log(`   Realm ID: ${mockRealmId}`);

    const qboClient = quickbooksService.getQboClient(
      "test-tenant",
      mockAccessToken,
      mockRealmId,
      mockRefreshToken
    );

    console.log("   ✅ QuickBooks client created successfully");
    console.log(`   Client type: ${typeof qboClient}`);
    console.log(
      `   Has getCompanyInfo method: ${
        typeof qboClient.getCompanyInfo === "function"
      }`
    );

    // Test the getCompanyInfo method (this will fail with auth error, but should not crash)
    console.log("\n2. Testing getCompanyInfo method...");
    try {
      await new Promise((resolve, reject) => {
        qboClient.getCompanyInfo((err, companyInfo) => {
          if (err) {
            console.log("   ✅ Method call completed (expected auth error)");
            console.log(`   Error: ${err.message}`);
            resolve(); // Don't reject, this is expected
          } else {
            console.log("   ✅ Method call successful (unexpected)");
            resolve(companyInfo);
          }
        });
      });
    } catch (error) {
      console.log(`   ❌ Method call failed: ${error.message}`);
    }

    console.log("\n🎉 QuickBooks client test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testQboClient().catch((error) => {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
});
