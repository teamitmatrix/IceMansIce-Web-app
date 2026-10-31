const axios = require('axios');

console.log('🧪 Testing Orders Endpoint Fix');
console.log('=============================');

async function testOrdersEndpoint() {
    try {
        // First, login to get a token
        console.log('1️⃣ Logging in to get token...');
        const loginRes = await axios.post('http://localhost:3001/auth/login', {
            email: 'profiletest@example.com', // Using the test user we created earlier
            password: 'profiletest123'
        });
        
        const token = loginRes.data.accessToken;
        console.log('   ✅ Login successful');
        
        // Test the orders endpoint
        console.log('2️⃣ Testing orders endpoint...');
        const ordersRes = await axios.get('http://localhost:3001/orders?page=1&limit=10', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('   ✅ Orders endpoint working!');
        console.log('   📊 Response structure:');
        console.log('      - Orders count:', ordersRes.data.orders.length);
        console.log('      - Pagination:', ordersRes.data.pagination);
        
        console.log('\n🎉 Orders endpoint is now working correctly!');
        
    } catch (error) {
        console.log('❌ ERROR:', error.response?.status, error.response?.data);
        
        if (error.response?.status === 401) {
            console.log('💡 Tip: User might not exist. Try registering first.');
        }
    }
}

// Wait for server to be ready
setTimeout(testOrdersEndpoint, 3000);