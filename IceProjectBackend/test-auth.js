const axios = require('axios');

async function testRegistration() {
  try {
    const response = await axios.post('http://localhost:3001/api/auth/register', {
      name: "Test User",
      email: "aqibaziz817@gmail.com",
      phone: "1234567890",
      address: "123 Test Street",
      password: "password123",
      role: "Customer"
    });
    
    console.log('Registration successful:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('Registration failed:', error.response.status, error.response.data);
    } else {
      console.log('Connection error:', error.message);
    }
  }
}

async function testLogin() {
  try {
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email: "aqibaziz817@gmail.com",
      password: "password123"
    });
    
    console.log('Login successful:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('Login failed:', error.response.status, error.response.data);
    } else {
      console.log('Connection error:', error.message);
    }
  }
}

async function runTests() {
  console.log('Testing registration...');
  await testRegistration();
  
  console.log('\nTesting login...');
  await testLogin();
}

runTests();