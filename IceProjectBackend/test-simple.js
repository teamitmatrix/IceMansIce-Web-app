const axios = require('axios');

async function testSimpleServer() {
  try {
    console.log('Testing simple server health...');
    const response = await axios.get('http://localhost:3003/health');
    console.log('✅ Simple server health check successful:', response.data);
    
    console.log('Testing simple server POST...');
    const postResponse = await axios.post('http://localhost:3003/test', {
      message: 'Hello from test client'
    });
    console.log('✅ Simple server POST successful:', postResponse.data);
    
  } catch (error) {
    console.error('❌ Simple server test failed:', error.message);
  }
}

testSimpleServer();