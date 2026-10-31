const express = require("express");
const config = require("./src/config");
const db = require("./src/db/db");
const createApp = require("./src/app");

async function testServer() {
  try {
    console.log("Testing full app startup...");
    
    // Test database connection
    await db.connect();
    console.log("✅ Database connected");
    
    // Test creating full app
    const app = createApp();
    console.log("✅ Full app created");
    
    // Test starting server
    const server = app.listen(3002, () => {
      console.log("✅ Full test server running on port 3002");
      server.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
    console.error("❌ Stack:", error.stack);
    process.exit(1);
  }
}

testServer();

testServer();