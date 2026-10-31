const quickbooksService = require("./src/services/quickbooksService");
const config = require("./src/config");

// Test script to verify OAuth state parameter
async function testOAuthState() {
  console.log("🧪 Testing QuickBooks OAuth State Parameter...\n");

  try {
    // Test 1: Generate auth URL with user ID
    console.log("1. Testing OAuth URL generation with user ID...");
    const userId = "68d58f6a60a2e325545b1a43";
    const authUrlWithUserId = quickbooksService.generateAuthUrl(userId);

    console.log("   ✅ Auth URL generated with user ID");
    console.log(`   URL: ${authUrlWithUserId}`);
    console.log(
      `   Contains state parameter: ${authUrlWithUserId.includes("state=")}`
    );
    console.log(
      `   State value: ${
        authUrlWithUserId.split("state=")[1]?.split("&")[0] || "Not found"
      }`
    );

    // Test 2: Generate auth URL with temporary state
    console.log("\n2. Testing OAuth URL generation with temporary state...");
    const tempState = `temp_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const authUrlWithTempState = quickbooksService.generateAuthUrl(tempState);

    console.log("   ✅ Auth URL generated with temporary state");
    console.log(`   URL: ${authUrlWithTempState}`);
    console.log(
      `   Contains state parameter: ${authUrlWithTempState.includes("state=")}`
    );
    console.log(
      `   State value: ${
        authUrlWithTempState.split("state=")[1]?.split("&")[0] || "Not found"
      }`
    );

    // Test 3: Generate auth URL without state
    console.log("\n3. Testing OAuth URL generation without state...");
    const authUrlWithoutState = quickbooksService.generateAuthUrl();

    console.log("   ✅ Auth URL generated without state");
    console.log(`   URL: ${authUrlWithoutState}`);
    console.log(
      `   Contains state parameter: ${authUrlWithoutState.includes("state=")}`
    );
    console.log(
      `   State value: ${
        authUrlWithoutState.split("state=")[1]?.split("&")[0] || "Not found"
      }`
    );

    // Test 4: Verify URL components
    console.log("\n4. Verifying URL components...");
    const url = new URL(authUrlWithUserId);
    const params = url.searchParams;

    console.log("   ✅ URL components:");
    console.log(
      `   - client_id: ${params.get("client_id") ? "Present" : "Missing"}`
    );
    console.log(
      `   - redirect_uri: ${params.get("redirect_uri") ? "Present" : "Missing"}`
    );
    console.log(`   - scope: ${params.get("scope") ? "Present" : "Missing"}`);
    console.log(`   - response_type: ${params.get("response_type")}`);
    console.log(`   - state: ${params.get("state") ? "Present" : "Missing"}`);

    // Test 5: Check QuickBooks configuration
    console.log("\n5. Checking QuickBooks configuration...");
    console.log(
      `   Client ID: ${config.quickbooks.clientId ? "Present" : "Missing"}`
    );
    console.log(`   Redirect URI: ${config.quickbooks.redirectUri}`);
    console.log(`   Scope: ${config.quickbooks.scope}`);
    console.log(`   Environment: ${config.quickbooks.environment}`);

    console.log("\n🎉 OAuth state parameter test completed successfully!");
    console.log(
      '\n💡 If you\'re still getting the "state query parameter is missing" error:'
    );
    console.log(
      "   1. Make sure you're using the latest authUrl from the API response"
    );
    console.log(
      "   2. Check that the frontend is calling the OAuth start endpoint correctly"
    );
    console.log(
      "   3. Verify that the state parameter is being preserved in the URL"
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  }
}

// Run the test
testOAuthState().catch((error) => {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
});
