const axios = require("axios");

// Test the callback endpoint directly
async function testCallback() {
  console.log("🧪 Testing QuickBooks OAuth Callback...\n");

  try {
    const callbackUrl = "http://localhost:3001/qbo/oauth/callback";
    const params = {
      code: "test_code_123",
      realmId: "test_realm_456",
      state: "68d58f6a60a2e325545b1a43",
    };

    console.log("1. Testing callback endpoint...");
    console.log(`   URL: ${callbackUrl}`);
    console.log(`   Code: ${params.code}`);
    console.log(`   Realm ID: ${params.realmId}`);
    console.log(`   State: ${params.state}`);

    const response = await axios.get(callbackUrl, {
      params,
      timeout: 10000, // 10 second timeout
    });

    console.log("   ✅ Callback endpoint responded");
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.log("   ❌ Server is not running");
    } else if (error.code === "ECONNABORTED") {
      console.log("   ❌ Request timed out - server might be hanging");
    } else if (error.response) {
      console.log(
        `   ❌ Server responded with error: ${error.response.status}`
      );
      console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

// Run the test
testCallback().catch((error) => {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
});
