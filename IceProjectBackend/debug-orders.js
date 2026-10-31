const axios = require('axios');

console.log('🔍 Debugging Orders Endpoint Issue');
console.log('==================================');

async function debugOrdersEndpoint() {
    try {
        // Test 1: Check if server is responding
        console.log('1️⃣ Testing server health...');
        const healthRes = await axios.get('http://localhost:3001/health');
        console.log('   ✅ Server is running:', healthRes.status);
        
        // Test 2: Test orders endpoint without auth (should get 401)
        console.log('2️⃣ Testing orders endpoint without auth...');
        try {
            await axios.get('http://localhost:3001/orders');
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('   ✅ Orders endpoint exists (got 401 Unauthorized as expected)');
            } else {
                console.log('   ❌ Unexpected error:', error.response?.status, error.response?.data);
            }
        }
        
        // Test 3: Login and get token
        console.log('3️⃣ Logging in to get auth token...');
        const loginRes = await axios.post('http://localhost:3001/auth/login', {
            email: 'profiletest@example.com',
            password: 'profiletest123'
        });
        const token = loginRes.data.accessToken;
        console.log('   ✅ Login successful, got token');
        
        // Test 4: Test orders endpoint with auth
        console.log('4️⃣ Testing orders endpoint with auth...');
        const ordersRes = await axios.get('http://localhost:3001/orders?page=1&limit=10', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   ✅ Orders endpoint working!');
        console.log('   📊 Orders found:', ordersRes.data.orders?.length || 0);
        
        // Test 5: Check database for orders
        console.log('5️⃣ Checking database for orders...');
        const MongoClient = require('mongodb').MongoClient;
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('sales_system');
        const ordersCount = await db.collection('salesorders').countDocuments();
        console.log('   📊 Orders in database:', ordersCount);
        await client.close();
        
        console.log('\n🎉 Debugging complete!');
        
    } catch (error) {
        console.log('❌ ERROR:', error.response?.status || 'Network Error');
        console.log('   Message:', error.response?.data?.message || error.message);
        console.log('   URL:', error.config?.url);
    }
}

// Wait for server to be ready
setTimeout(debugOrdersEndpoint, 2000);