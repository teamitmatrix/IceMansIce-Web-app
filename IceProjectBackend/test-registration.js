const axios = require('axios');

async function testHealth() {
  try {
    console.log('Testing health endpoint...');
    const response = await axios.get('http://localhost:3002/health');
    console.log('✅ Health check successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testRegistration() {
  try {
    console.log('Testing registration endpoint...');
    const response = await axios.post('http://localhost:3002/auth/register', {
      name: 'Test User',
      email: 'testuser@example.com',
      phone: '1234567890',
      address: '123 Test Street, Test City',
      password: 'password123',
      role: 'Customer'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    console.log('✅ Registration successful:', response.data);
  } catch (error) {
    console.error('❌ Registration failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function main() {
  const healthOk = await testHealth();
  if (healthOk) {
    await testRegistration();
  }
}

main();