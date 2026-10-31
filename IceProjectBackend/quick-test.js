const axios = require('axios');

console.log('🔍 Quick Authentication Verification Test');
console.log('=========================================');

async function quickTest() {
    const testData = {
        name: 'Quick Test User',
        email: 'quicktest@example.com', 
        phone: '9876543210',
        address: '456 Quick Street',
        password: 'quicktest123'
    };
    
    try {
        // Register
        console.log('1️⃣ Registering user...');
        const registerRes = await axios.post('http://localhost:3001/auth/register', testData);
        console.log('   ✅ Registration Response:', registerRes.status, registerRes.data.message);
        
        // Login immediately  
        console.log('2️⃣ Logging in with same credentials...');
        const loginRes = await axios.post('http://localhost:3001/auth/login', {
            email: testData.email,
            password: testData.password
        });
        console.log('   ✅ Login Response:', loginRes.status, loginRes.data.message);
        
        console.log('\n🎉 SUCCESS: Authentication flow works correctly!');
        console.log('   Registration ✅ → Login ✅');
        
    } catch (error) {
        console.log('❌ ERROR:', error.response?.status, error.response?.data);
    }
}

quickTest();