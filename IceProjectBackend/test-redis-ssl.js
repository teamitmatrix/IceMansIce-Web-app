const Redis = require('ioredis');
require('dotenv').config();

// Simulate Render environment
process.env.NODE_ENV = 'production';
process.env.RENDER = 'true';

const config = require('./src/config');

console.log('🔗 Testing Redis SSL Configuration for Render...\n');

async function testRedisSSL() {
  console.log('1. Environment Configuration:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   RENDER: ${process.env.RENDER}`);
  console.log(`   REDIS_URL: ${process.env.REDIS_URL ? 'Set' : 'Not set'}`);
  console.log(`   Cloud Platform Detected: ${config.redis.isCloudPlatform}`);
  console.log(`   Redis SSL Config:`, config.redis.ssl);

  if (!process.env.REDIS_URL) {
    console.log('\n❌ REDIS_URL not set. Please set your Redis URL.');
    return;
  }

  console.log('\n2. Testing Redis Connection...');
  
  // Create Redis connection with SSL configuration
  const redisOptions = { 
    // Enhanced SSL configuration for cloud platforms
    ...(config.redis.isCloudPlatform && {
      tls: config.redis.ssl,
      connectTimeout: 60000,
      lazyConnect: true,
      retryDelayOnFailover: 1000,
      maxRetriesPerRequest: 3,
    })
  };

  try {
    const redis = new Redis(config.redis.url, redisOptions);
    
    console.log('   Connecting to Redis...');
    await redis.connect();
    console.log('   ✅ Redis connection successful');

    console.log('\n3. Testing Redis Operations...');
    
    // Test basic operations
    await redis.set('test:ssl', 'success');
    const value = await redis.get('test:ssl');
    console.log(`   ✅ Set/Get test: ${value}`);
    
    // Test ping
    const pong = await redis.ping();
    console.log(`   ✅ Ping test: ${pong}`);
    
    // Clean up
    await redis.del('test:ssl');
    console.log('   ✅ Cleanup completed');
    
    await redis.disconnect();
    console.log('   ✅ Redis disconnected successfully');
    
    console.log('\n🎉 Redis SSL test completed successfully!');
    
  } catch (error) {
    console.log(`   ❌ Redis connection failed: ${error.message}`);
    
    if (error.code === 'ERR_SSL_WRONG_VERSION_NUMBER') {
      console.log('\n🔧 SSL Error detected. This is the issue we need to fix.');
      console.log('   The Redis SSL configuration needs to be updated.');
    }
    
    console.log('\n📝 Environment Variables to Set in Render:');
    console.log('   REDIS_SSL_VERIFY=true');
    console.log('   REDIS_TLS_VERSION=TLS_method');
    
    console.log('\n🔧 Alternative Solutions:');
    console.log('   1. Set REDIS_SSL_VERIFY=false (NOT recommended for production)');
    console.log('   2. Use a non-SSL Redis connection if available');
    console.log('   3. Contact Redis provider for SSL configuration support');
  }
}

testRedisSSL().catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
