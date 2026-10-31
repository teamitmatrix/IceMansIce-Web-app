const axios = require("axios");

// Test the actual QuickBooks callback URL
async function testRealCallback() {
  console.log("🧪 Testing Real QuickBooks OAuth Callback...\n");

  try {
    // Use the actual callback URL from your error
    const callbackUrl = "http://localhost:3001/qbo/oauth/callback";
    const params = {
      code: "XAB11759176858QhmANNH0soj59nxkJbk2QxKpSevZXQwwEwL4",
      realmId: "9341455427465473",
      state: "68d58f6a60a2e325545b1a43",
    };

    console.log("1. Testing real QuickBooks callback...");
    console.log(`   URL: ${callbackUrl}`);
    console.log(`   Code: ${params.code.substring(0, 20)}...`);
    console.log(`   Realm ID: ${params.realmId}`);
    console.log(`   State: ${params.state}`);

    console.log("\n2. Making request (this may take a while)...");

    const response = await axios.get(callbackUrl, {
      params,
      timeout: 60000, // 60 second timeout
    });

    console.log("   ✅ Callback completed successfully!");
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
testRealCallback().catch((error) => {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
});
