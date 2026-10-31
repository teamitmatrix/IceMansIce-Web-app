// Debug script to identify where SSL errors occur during startup
require("dotenv").config();

console.log('🔍 Debugging SSL errors during startup...\n');

console.log('1. Environment variables:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   RENDER: ${process.env.RENDER}`);
console.log(`   QBO_SSL_VERIFY: ${process.env.QBO_SSL_VERIFY}`);
console.log(`   QBO_TLS_VERSION: ${process.env.QBO_TLS_VERSION}`);

console.log('\n2. Loading config...');
try {
  const config = require('./src/config');
  console.log(`   ✅ Config loaded successfully`);
  console.log(`   Cloud platform detected: ${config.quickbooks.isCloudPlatform}`);
  console.log(`   TLS version: ${config.quickbooks.tlsVersion}`);
  console.log(`   SSL verify: ${config.quickbooks.sslVerify}`);
} catch (error) {
  console.log(`   ❌ Config failed: ${error.message}`);
  process.exit(1);
}

console.log('\n3. Loading logger...');
try {
  const logger = require('./src/utils/logger');
  console.log(`   ✅ Logger loaded successfully`);
} catch (error) {
  console.log(`   ❌ Logger failed: ${error.message}`);
  process.exit(1);
}

console.log('\n4. Loading database...');
try {
  const db = require('./src/db/db');
  console.log(`   ✅ Database module loaded successfully`);
} catch (error) {
  console.log(`   ❌ Database failed: ${error.message}`);
  process.exit(1);
}

console.log('\n5. Loading QuickBooks service...');
try {
  const qboService = require('./src/services/quickbooksService');
  console.log(`   ✅ QuickBooks service loaded successfully`);
} catch (error) {
  console.log(`   ❌ QuickBooks service failed: ${error.message}`);
  console.log(`   Error details:`, error);
  process.exit(1);
}

console.log('\n6. Loading QBO sync job...');
try {
  const qboSync = require('./src/jobs/qboSync');
  console.log(`   ✅ QBO sync job loaded successfully`);
} catch (error) {
  console.log(`   ❌ QBO sync job failed: ${error.message}`);
  console.log(`   Error details:`, error);
  process.exit(1);
}

console.log('\n7. Loading QBO controller...');
try {
  const qboController = require('./src/controllers/qboController');
  console.log(`   ✅ QBO controller loaded successfully`);
} catch (error) {
  console.log(`   ❌ QBO controller failed: ${error.message}`);
  console.log(`   Error details:`, error);
  process.exit(1);
}

console.log('\n8. Loading DAL...');
try {
  const dal = require('./src/dal');
  console.log(`   ✅ DAL loaded successfully`);
} catch (error) {
  console.log(`   ❌ DAL failed: ${error.message}`);
  console.log(`   Error details:`, error);
  process.exit(1);
}

console.log('\n9. Loading app...');
try {
  const createApp = require('./src/app');
  console.log(`   ✅ App module loaded successfully`);
} catch (error) {
  console.log(`   ❌ App failed: ${error.message}`);
  console.log(`   Error details:`, error);
  process.exit(1);
}

console.log('\n🎉 All modules loaded successfully!');
console.log('\nThe SSL error is likely happening during runtime, not startup.');
