const https = require('https');
const axios = require('axios');

console.log('🌐 Testing SSL Configuration for Render Deployment...\n');

// Simulate Render environment
process.env.NODE_ENV = 'production';
process.env.RENDER = 'true';
process.env.RENDER_EXTERNAL_URL = 'https://pwa-backend-fxw6.onrender.com';

// Load config with Render environment
const config = require('./src/config');

async function testRenderSSLConfiguration() {
  console.log('1. Render Environment Detection:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   RENDER: ${process.env.RENDER}`);
  console.log(`   RENDER_EXTERNAL_URL: ${process.env.RENDER_EXTERNAL_URL}`);
  console.log(`   Cloud Platform Detected: ${config.quickbooks.isCloudPlatform}`);
  console.log(`   TLS Version: ${config.quickbooks.tlsVersion}`);
  console.log(`   SSL Verify: ${config.quickbooks.sslVerify}\n`);

  // Define cloud ciphers for all tests
  const cloudCiphers = [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA384',
    'AES128-GCM-SHA256',
    'AES256-GCM-SHA384',
    'AES128-SHA256',
    'AES256-SHA256',
    'ECDHE-RSA-AES128-SHA',
    'ECDHE-RSA-AES256-SHA',
    'AES128-SHA',
    'AES256-SHA'
  ].join(':');

  // Test 1: QuickBooks OAuth endpoint with Render-optimized settings
  console.log('2. Testing QuickBooks OAuth endpoint with Render settings...');
  try {

    const response = await axios.get('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      timeout: 60000, // Extended timeout for cloud
      validateStatus: () => true,
      httpsAgent: new https.Agent({
        secureProtocol: 'TLS_method',
        rejectUnauthorized: true,
        keepAlive: true,
        honorCipherOrder: true,
        ciphers: cloudCiphers,
        timeout: 60000,
        maxSockets: 50,
        maxFreeSockets: 10,
      })
    });
    console.log(`   ✅ Render SSL configuration: Working (Status: ${response.status})`);
  } catch (error) {
    console.log(`   ❌ Render SSL configuration: Failed - ${error.message}`);
    if (error.code === 'ERR_SSL_WRONG_VERSION_NUMBER') {
      console.log('   🔧 This is the SSL error we need to fix for Render');
    }
  }

  // Test 2: Test all QuickBooks endpoints
  console.log('\n3. Testing all QuickBooks endpoints...');
  const endpoints = [
    'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    'https://appcenter.intuit.com/connect/oauth2',
    'https://sandbox-quickbooks.api.intuit.com/v3/company/123/companyinfo/1',
    'https://quickbooks.api.intuit.com/v3/company/123/companyinfo/1'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, {
        timeout: 60000,
        validateStatus: () => true,
        httpsAgent: new https.Agent({
          secureProtocol: 'TLS_method',
          rejectUnauthorized: true,
          keepAlive: true,
          honorCipherOrder: true,
          ciphers: cloudCiphers,
          timeout: 60000,
          maxSockets: 50,
          maxFreeSockets: 10,
        })
      });
      console.log(`   ✅ ${endpoint}: Working (Status: ${response.status})`);
    } catch (error) {
      console.log(`   ❌ ${endpoint}: Failed - ${error.message}`);
    }
  }

  // Test 3: Test with different TLS versions on Render
  console.log('\n4. Testing different TLS versions for Render...');
  const tlsVersions = ['TLS_method', 'TLSv1_2_method'];
  
  for (const tlsVersion of tlsVersions) {
    try {
      const response = await axios.get('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        timeout: 60000,
        validateStatus: () => true,
        httpsAgent: new https.Agent({
          secureProtocol: tlsVersion,
          rejectUnauthorized: true,
          keepAlive: true,
          honorCipherOrder: true,
          ciphers: cloudCiphers,
          timeout: 60000,
          maxSockets: 50,
          maxFreeSockets: 10,
        })
      });
      console.log(`   ✅ ${tlsVersion}: Working (Status: ${response.status})`);
    } catch (error) {
      console.log(`   ❌ ${tlsVersion}: Failed - ${error.message}`);
    }
  }

  console.log('\n5. Render Environment Variables to Set:');
  console.log('   In Render Dashboard > Environment:');
  console.log('   NODE_ENV=production');
  console.log('   RENDER=true');
  console.log('   QBO_TLS_VERSION=TLS_method');
  console.log('   QBO_SSL_VERIFY=true');

  console.log('\n6. Render Deployment Configuration:');
  console.log('   Build Command: npm ci');
  console.log('   Start Command: npm start');
  console.log('   Node Version: 18.x');

  console.log('\n7. QuickBooks Service Test:');
  try {
    const qboService = require('./src/services/quickbooksService');
    console.log('   ✅ QuickBooks service loaded successfully');
    console.log(`   ✅ Cloud platform detected: ${config.quickbooks.isCloudPlatform}`);
  } catch (error) {
    console.log(`   ❌ QuickBooks service error: ${error.message}`);
  }

  console.log('\n🎉 Render SSL configuration test completed!');
}

// Run the test
testRenderSSLConfiguration().catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
