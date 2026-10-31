const axios = require('axios');

console.log('🧪 Testing Customer Profile Fix');
console.log('===============================');

const testUser = {
    name: 'Profile Test User',
    email: 'profiletest@example.com',
    phone: '5551234567',
    address: '789 Profile Street',
    password: 'profiletest123'
};

async function testFlow() {
    try {
        // 1. Register new user
        console.log('1️⃣ Registering new customer user...');
        const registerRes = await axios.post('http://localhost:3001/auth/register', testUser);
        console.log('   ✅ Registration:', registerRes.data.message);
        
        // 2. Login to get token
        console.log('2️⃣ Logging in...');
        const loginRes = await axios.post('http://localhost:3001/auth/login', {
            email: testUser.email,
            password: testUser.password
        });
        console.log('   ✅ Login:', loginRes.data.message);
        
        const token = loginRes.data.accessToken;
        
        // 3. Test customer profile endpoint
        console.log('3️⃣ Testing customer profile endpoint...');
        const profileRes = await axios.get('http://localhost:3001/customers/profile', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   ✅ Profile retrieved:', profileRes.data.customer.name);
        
        // 4. Test credit application endpoint
        console.log('4️⃣ Testing credit application endpoint...');
        const creditApp = {
            requestedAmount: 5000,
            businessInfo: 'Test business',
            financialInfo: 'Test financial info'
        };
        
        const creditRes = await axios.post('http://localhost:3001/customers/credit-application', creditApp, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   ✅ Credit application:', creditRes.data.message);
        
        console.log('\n🎉 ALL TESTS PASSED! Customer profile endpoints working correctly.');
        
    } catch (error) {
        console.log('❌ ERROR:', error.response?.status, error.response?.data);
    }
}

// Wait for servers to be ready
setTimeout(testFlow, 3000);