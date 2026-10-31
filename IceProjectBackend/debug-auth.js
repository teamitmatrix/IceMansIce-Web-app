const axios = require('axios');

// Server configuration
const BASE_URL = 'http://localhost:3001';

// Test user data
const testUser = {
    name: 'Test Debug User',
    email: 'testdebug@example.com',
    phone: '1234567890',
    address: '123 Debug Street',
    password: 'debugpassword123'
};

async function clearTestUser() {
    try {
        console.log('🧹 Clearing any existing test user...');
        const MongoClient = require('mongodb').MongoClient;
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('pwa_development');
        const result = await db.collection('users').deleteMany({ email: testUser.email });
        await client.close();
        console.log(`✅ Cleared ${result.deletedCount} existing user(s)`);
    } catch (error) {
        console.log('⚠️ Warning: Could not clear existing user:', error.message);
    }
}

async function testRegistration() {
    console.log('\n📝 Testing Registration...');
    console.log('Request data:', JSON.stringify(testUser, null, 2));
    
    try {
        const response = await axios.post(`${BASE_URL}/auth/register`, testUser);
        console.log('✅ Registration SUCCESS');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.log('❌ Registration FAILED');
        console.log('Status:', error.response?.status || 'No status');
        console.log('Error:', error.response?.data || error.message);
        return null;
    }
}

async function testLogin() {
    console.log('\n🔐 Testing Login...');
    console.log('Login data:', JSON.stringify({ 
        email: testUser.email, 
        password: testUser.password 
    }, null, 2));
    
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        console.log('✅ Login SUCCESS');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.log('❌ Login FAILED');
        console.log('Status:', error.response?.status || 'No status');
        console.log('Error:', error.response?.data || error.message);
        return null;
    }
}

async function checkUserInDatabase() {
    console.log('\n🔍 Checking user in database...');
    try {
        const MongoClient = require('mongodb').MongoClient;
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('pwa_development');
        const user = await db.collection('users').findOne({ email: testUser.email });
        await client.close();
        
        if (user) {
            console.log('✅ User found in database');
            console.log('Stored email:', user.email);
            console.log('User ID:', user._id);
            console.log('Created at:', user.createdAt);
        } else {
            console.log('❌ User NOT found in database');
        }
        
        return user;
    } catch (error) {
        console.log('❌ Database check failed:', error.message);
        return null;
    }
}

async function runFullTest() {
    console.log('🚀 Starting Authentication Debug Test');
    console.log('================================');
    
    // Step 1: Clear any existing test user
    await clearTestUser();
    
    // Step 2: Test registration
    const registerResult = await testRegistration();
    
    // Step 3: Check if user was created in database
    const dbUser = await checkUserInDatabase();
    
    // Step 4: Test login
    const loginResult = await testLogin();
    
    // Summary
    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log('Registration successful:', registerResult ? '✅' : '❌');
    console.log('User in database:', dbUser ? '✅' : '❌');
    console.log('Login successful:', loginResult ? '✅' : '❌');
    
    if (registerResult && !loginResult) {
        console.log('\n🚨 ISSUE DETECTED: Registration succeeded but login failed!');
        console.log('This matches the user\'s reported problem.');
        
        if (dbUser) {
            console.log('💡 Possible causes:');
            console.log('- Password comparison issue');
            console.log('- Email case sensitivity');
            console.log('- Database query issue');
        }
    }
    
    console.log('\n🏁 Test Complete');
}

// Wait a moment for server to be ready, then run test
setTimeout(runFullTest, 2000);