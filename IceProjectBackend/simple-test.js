const axios = require('axios');

console.log('Starting authentication test...\n');

// Clear any existing user first
async function clearUser() {
    try {
        const MongoClient = require('mongodb').MongoClient;
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('pwa_development');
        await db.collection('users').deleteMany({ email: 'test@example.com' });
        await client.close();
        console.log('✓ Cleared existing test user');
    } catch (error) {
        console.log('⚠ Could not clear existing user:', error.message);
    }
}

async function testRegister() {
    try {
        console.log('📝 Testing registration...');
        const response = await axios.post('http://localhost:3001/auth/register', {
            name: 'Test User',
            email: 'test@example.com',
            phone: '1234567890',
            address: '123 Test Street',
            password: 'password123'
        });
        
        console.log('✅ Registration SUCCESS');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.log('❌ Registration FAILED');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', error.response.data);
        } else {
            console.log('Network error:', error.message);
        }
        return false;
    }
}

async function testLogin() {
    try {
        console.log('\n🔐 Testing login...');
        const response = await axios.post('http://localhost:3001/auth/login', {
            email: 'test@example.com',
            password: 'password123'
        });
        
        console.log('✅ Login SUCCESS');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.log('❌ Login FAILED');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', error.response.data);
        } else {
            console.log('Network error:', error.message);
        }
        return false;
    }
}

async function runTest() {
    await clearUser();
    const registerSuccess = await testRegister();
    if (registerSuccess) {
        await testLogin();
    }
    console.log('\n🏁 Test completed');
}

runTest();