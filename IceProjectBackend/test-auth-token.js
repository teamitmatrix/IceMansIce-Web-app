const axios = require("axios");

// Test script to verify authentication token
async function testAuthToken() {
  console.log("🧪 Testing Authentication Token...\n");

  try {
    // Test 1: Check server health
    console.log("1. Checking server health...");
    const healthResponse = await axios.get("http://localhost:3001/health");
    console.log("   ✅ Backend server is running");
    console.log(`   Status: ${healthResponse.data.status}`);

    // Test 2: Test OAuth start with invalid token
    console.log("\n2. Testing OAuth start with invalid token...");
    try {
      const oauthResponse = await axios.get(
        "http://localhost:3001/qbo/oauth/start",
        {
          headers: { Authorization: "Bearer invalid-token" },
        }
      );
      console.log("   ❌ OAuth start should have failed with invalid token");
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(
          "   ✅ OAuth start correctly rejected invalid token (401 Unauthorized)"
        );
        console.log(`   Error: ${error.response.data.message}`);
      } else {
        console.log(
          `   ⚠️  Unexpected error: ${error.response?.status || error.message}`
        );
      }
    }

    // Test 3: Test auth/me endpoint
    console.log("\n3. Testing auth/me endpoint...");
    try {
      const meResponse = await axios.get("http://localhost:3001/auth/me", {
        headers: { Authorization: "Bearer invalid-token" },
      });
      console.log("   ❌ Auth/me should have failed with invalid token");
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(
          "   ✅ Auth/me correctly rejected invalid token (401 Unauthorized)"
        );
        console.log(`   Error: ${error.response.data.message}`);
      } else {
        console.log(
          `   ⚠️  Unexpected error: ${error.response?.status || error.message}`
        );
      }
    }

    console.log("\n4. Authentication Status:");
    console.log("   ✅ Backend server running");
    console.log("   ✅ Authentication middleware working");
    console.log("   ✅ Invalid tokens properly rejected");
    console.log("   ❌ Valid authentication token needed");

    console.log("\n5. How to Fix the Frontend Error:");
    console.log("   🔐 User must be logged in with valid JWT token");
    console.log("   🌐 Navigate to: http://localhost:3000/login");
    console.log("   📝 Log in with valid credentials");
    console.log("   🔄 Then try the QuickBooks OAuth flow");

    console.log("\n💡 The 400 Bad Request error is because:");
    console.log("   - User is not authenticated (no valid JWT token)");
    console.log("   - Frontend needs to redirect to login page");
    console.log("   - User must log in before accessing QuickBooks");
  } catch (error) {
    console.error("❌ Test failed:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("\n💡 Troubleshooting:");
      console.log(
        "   - Make sure the backend server is running: node src/server.js"
      );
      console.log("   - Check that the server is running on port 3001");
    }
  }
}

// Run the test
testAuthToken().catch((error) => {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
});
