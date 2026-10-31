const https = require('https');
const axios = require('axios');
const config = require('./src/config');

console.log('🔧 Testing SSL Configuration for QuickBooks Integration...\n');

// Test SSL configuration
async function testSSLConfiguration() {
  console.log('1. Current SSL Configuration:');
  console.log(`   TLS Version: ${config.quickbooks.tlsVersion}`);
  console.log(`   SSL Verify: ${config.quickbooks.sslVerify}`);
  console.log(`   Cloud Platform: ${config.quickbooks.isCloudPlatform}`);
  console.log(`   Node.js Version: ${process.version}`);
  console.log(`   OpenSSL Version: ${process.versions.openssl}\n`);

  // Test 1: Basic HTTPS connection to QuickBooks OAuth endpoint
  console.log('2. Testing HTTPS connection to QuickBooks OAuth endpoint...');
  try {
    const response = await axios.get('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      timeout: 10000,
      validateStatus: () => true, // Accept any status code
      httpsAgent: new https.Agent({
        secureProtocol: config.quickbooks.tlsVersion,
        rejectUnauthorized: config.quickbooks.sslVerify,
        keepAlive: true,
        honorCipherOrder: true,
      })
    });
    console.log(`   ✅ Connection successful (Status: ${response.status})`);
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    if (error.code === 'ERR_SSL_WRONG_VERSION_NUMBER') {
      console.log('   🔧 This is the SSL version error we need to fix');
    }
  }

  // Test 2: Test with different TLS versions
  console.log('\n3. Testing different TLS versions...');
  const tlsVersions = ['TLS_method', 'TLSv1_2_method', 'TLSv1_3_method'];
  
  for (const tlsVersion of tlsVersions) {
    try {
      const response = await axios.get('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        timeout: 5000,
        validateStatus: () => true,
        httpsAgent: new https.Agent({
          secureProtocol: tlsVersion,
          rejectUnauthorized: true,
          keepAlive: true,
          honorCipherOrder: true,
        })
      });
      console.log(`   ✅ ${tlsVersion}: Working (Status: ${response.status})`);
    } catch (error) {
      console.log(`   ❌ ${tlsVersion}: Failed - ${error.message}`);
    }
  }

  // Test 3: Test QuickBooks API endpoints
  console.log('\n4. Testing QuickBooks API endpoints...');
  const endpoints = [
    'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    'https://appcenter.intuit.com/connect/oauth2',
    'https://sandbox-quickbooks.api.intuit.com/v3/company/123/companyinfo/1'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, {
        timeout: 5000,
        validateStatus: () => true,
        httpsAgent: new https.Agent({
          secureProtocol: config.quickbooks.tlsVersion,
          rejectUnauthorized: config.quickbooks.sslVerify,
          keepAlive: true,
          honorCipherOrder: true,
        })
      });
      console.log(`   ✅ ${endpoint}: Working (Status: ${response.status})`);
    } catch (error) {
      console.log(`   ❌ ${endpoint}: Failed - ${error.message}`);
    }
  }

  // Test 4: Test with cloud-compatible cipher suites
  console.log('\n5. Testing with enhanced cipher suites...');
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

  try {
    const response = await axios.get('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      timeout: 10000,
      validateStatus: () => true,
      httpsAgent: new https.Agent({
        secureProtocol: config.quickbooks.tlsVersion,
        rejectUnauthorized: config.quickbooks.sslVerify,
        keepAlive: true,
        honorCipherOrder: true,
        ciphers: cloudCiphers,
      })
    });
    console.log(`   ✅ Enhanced ciphers: Working (Status: ${response.status})`);
  } catch (error) {
    console.log(`   ❌ Enhanced ciphers: Failed - ${error.message}`);
  }

  console.log('\n6. Recommendations:');
  if (config.quickbooks.isCloudPlatform) {
    console.log('   🌐 Cloud platform detected - using enhanced SSL configuration');
    console.log('   📝 Set these environment variables:');
    console.log('      QBO_TLS_VERSION=TLS_method');
    console.log('      QBO_SSL_VERIFY=true');
  } else {
    console.log('   🏠 Local development environment detected');
    console.log('   📝 Set these environment variables:');
    console.log('      QBO_TLS_VERSION=TLS_method');
    console.log('      QBO_SSL_VERIFY=true');
  }

  console.log('\n7. Environment Variables to Set:');
  console.log('   export QBO_TLS_VERSION=TLS_method');
  console.log('   export QBO_SSL_VERIFY=true');
  console.log('   # For cloud platforms, also set:');
  console.log('   export NODE_ENV=production');
  console.log('   export RENDER=true  # or HEROKU=true, VERCEL=true');

  console.log('\n🎉 SSL configuration test completed!');
}

// Run the test
testSSLConfiguration().catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});