const mongoose = require('mongoose');
db_url = 'mongodb://localhost:27017/sales_system';
async function createSampleData() {
    try {
        console.log('🗄️ Creating sample data for MongoDB Compass');
        console.log('=============================================');
        
        // Connect to MongoDB
        await mongoose.connect(db_url);
        console.log('✅ Connected to MongoDB');
        
        // Import models
        const User = require('./src/models/User');
        const Customer = require('./src/models/Customer');
        const Product = require('./src/models/Product');
        const SalesOrder = require('./src/models/SalesOrder');
        
        // Clear existing data
        console.log('🧹 Clearing existing data...');
        await User.deleteMany({});
        await Customer.deleteMany({});
        await Product.deleteMany({});
        await SalesOrder.deleteMany({});
        
        // Create sample user
        console.log('👤 Creating sample user...');
        const user = new User({
            name: 'Demo Customer',
            email: 'demo@example.com',
            phone: '1234567890',
            address: {
                street: '123 Demo Street',
                city: 'Demo City',
                state: 'Demo State',
                zipCode: '12345',
                country: 'United States'
            },
            password: 'demo1234',
            role: 'customer'
        });
        await user.save();
        console.log('✅ User created');
        
        // Create sample customer
        console.log('🏢 Creating sample customer...');
        const customer = new Customer({
            userId: user._id,
            name: 'Demo Customer',
            email: 'demo@example.com',
            phone: '1234567890',
            address: {
                street: '123 Demo Street',
                city: 'Demo City',
                state: 'Demo State',
                zipCode: '12345',
                country: 'United States'
            },
            balance: 0,
            creditLimit: 5000,
            paymentTerms: 'net30'
        });
        await customer.save();
        console.log('✅ Customer created');
        
        // Create sample products
        console.log('📦 Creating sample products...');
        const products = [
            {
                name: 'Product A',
                sku: 'PROD-A-001',
                description: 'Sample Product A',
                price: 99.99,
                cost: 50.00,
                totalStock: 100,
                reorderLevel: 10,
                isActive: true
            },
            {
                name: 'Product B',
                sku: 'PROD-B-002',
                description: 'Sample Product B',
                price: 149.99,
                cost: 75.00,
                totalStock: 50,
                reorderLevel: 5,
                isActive: true
            },
            {
                name: 'Wireless Headphones',
                sku: 'WH-001',
                description: 'Premium Bluetooth wireless headphones with noise cancellation',
                price: 299.99,
                cost: 150.00,
                totalStock: 75,
                reorderLevel: 8,
                isActive: true
            },
            {
                name: 'Smart Home Hub',
                sku: 'SHH-002',
                description: 'Smart home control hub with voice assistant integration',
                price: 199.99,
                cost: 100.00,
                totalStock: 30,
                reorderLevel: 5,
                isActive: true
            },
            {
                name: 'USB-C Power Bank',
                sku: 'PB-003',
                description: '20,000mAh portable power bank with fast charging',
                price: 79.99,
                cost: 40.00,
                totalStock: 120,
                reorderLevel: 15,
                isActive: true
            }
        ];
        
        const createdProducts = await Product.insertMany(products);
        console.log('✅ Products created:', createdProducts.length);
        
        // Create sample orders
        console.log('📋 Creating sample orders...');
        
        // Generate order numbers
        const orderNumber1 = await SalesOrder.generateOrderNumber();
        const orderNumber2 = await SalesOrder.generateOrderNumber();
        
        const orders = [
            {
                customerId: customer._id,
                orderNumber: orderNumber1,
                items: [
                    {
                        productId: createdProducts[0]._id,
                        name: createdProducts[0].name,
                        sku: createdProducts[0].sku,
                        quantity: 2,
                        unitPrice: createdProducts[0].price,
                        discount: 0,
                        taxRate: 0,
                        lineTotal: createdProducts[0].price * 2
                    }
                ],
                status: 'pending',
                orderDate: new Date(),
                requestedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                subtotal: createdProducts[0].price * 2,
                taxAmount: 0,
                discountAmount: 0,
                total: createdProducts[0].price * 2
            },
            {
                customerId: customer._id,
                orderNumber: orderNumber2,
                items: [
                    {
                        productId: createdProducts[1]._id,
                        name: createdProducts[1].name,
                        sku: createdProducts[1].sku,
                        quantity: 1,
                        unitPrice: createdProducts[1].price,
                        discount: 0,
                        taxRate: 0,
                        lineTotal: createdProducts[1].price
                    }
                ],
                status: 'approved',
                orderDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
                requestedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
                subtotal: createdProducts[1].price,
                taxAmount: 0,
                discountAmount: 0,
                total: createdProducts[1].price
            }
        ];
        
        const createdOrders = await SalesOrder.insertMany(orders);
        console.log('✅ Orders created:', createdOrders.length);
        
        console.log('\n🎉 Sample data created successfully!');
        console.log('📊 Data Summary:');
        console.log('   - Users:', await User.countDocuments());
        console.log('   - Customers:', await Customer.countDocuments());
        console.log('   - Products:', await Product.countDocuments());
        console.log('   - Orders:', await SalesOrder.countDocuments());
        
        console.log('\n🔍 You can now see this data in MongoDB Compass:');
        console.log('   Database: sales_system');
        console.log('   Collections: users, customers, products, salesorders');
        
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
        
    } catch (error) {
        console.error('❌ Error creating sample data:', error);
    }
}

createSampleData();