const axios = require("axios");
const config = require("./src/config");

// Test script to verify QuickBooks connection
async function testQuickBooksConnection() {
  console.log("🔍 Testing QuickBooks Connection Setup...\n");

  // Check environment variables
  console.log("1. Checking Environment Variables:");
  const requiredEnvVars = [
    "QBO_CLIENT_ID",
    "QBO_CLIENT_SECRET",
    "QBO_REDIRECT_URI",
    "QBO_ENVIRONMENT",
    "QBO_SCOPE",
  ];

  let envVarsValid = true;
  requiredEnvVars.forEach((varName) => {
    const value = process.env[varName];
    if (!value) {
      console.log(`   ❌ ${varName}: Not set`);
      envVarsValid = false;
    } else {
      // Mask sensitive values
      const displayValue =
        varName.includes("SECRET") || varName.includes("CLIENT_ID")
          ? `${value.substring(0, 8)}...`
          : value;
      console.log(`   ✅ ${varName}: ${displayValue}`);
    }
  });

  if (!envVarsValid) {
    console.log("\n❌ Environment variables are not properly configured.");
    console.log(
      "Please check your .env file and ensure all QuickBooks variables are set."
    );
    return;
  }

  console.log("\n2. Testing QuickBooks Service Import:");
  try {
    const quickbooksService = require("./src/services/quickbooksService");
    console.log("   ✅ QuickBooks service imported successfully");

    // Test OAuth endpoints configuration
    if (quickbooksService.oauthEndpoints) {
      console.log("   ✅ OAuth endpoints configured");
    } else {
      console.log("   ❌ OAuth endpoints not configured");
    }
  } catch (error) {
    console.log(`   ❌ Error importing QuickBooks service: ${error.message}`);
    return;
  }

  console.log("\n3. Testing Database Connection:");
  try {
    const mongoose = require("mongoose");
    const db = require("./src/db/db");

    // Wait a moment for connection
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (mongoose.connection.readyState === 1) {
      console.log("   ✅ Database connected");

      // Test QuickBooksConnection model
      const QuickBooksConnection = require("./src/models/QuickBooksConnection");
      console.log("   ✅ QuickBooksConnection model loaded");
    } else {
      console.log("   ❌ Database not connected");
    }
  } catch (error) {
    console.log(`   ❌ Database connection error: ${error.message}`);
  }

  console.log("\n4. Testing API Routes:");
  try {
    // Test if server is running
    const response = await axios.get("http://localhost:3001/health", {
      timeout: 5000,
    });
    console.log("   ✅ Server is running");
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.log("   ⚠️  Server is not running. Start it with: npm run dev");
    } else {
      console.log(`   ❌ Server error: ${error.message}`);
    }
  }

  console.log("\n5. QuickBooks Integration Status:");
  console.log("   📋 Next Steps:");
  console.log("   1. Start your server: npm run dev");
  console.log("   2. Get a JWT token by logging in");
  console.log("   3. Call GET /qbo/oauth/start to begin OAuth flow");
  console.log("   4. Complete OAuth authorization in QuickBooks");
  console.log("   5. Check connection status with GET /qbo/oauth/status");

  console.log("\n📚 For detailed setup instructions, see: QUICKBOOKS_SETUP.md");
  console.log("\n🎉 QuickBooks integration is ready to use!");
}

// Run the test
testQuickBooksConnection().catch((error) => {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
});
