const mongoose = require('mongoose');

// Test database connection
mongoose.connect('mongodb://localhost:27017/sales_system')
  .then(async () => {
    console.log('✅ Database connected successfully');
    
    // Create a test collection to make the database appear in Compass
    const testSchema = new mongoose.Schema({
      name: String,
      createdAt: { type: Date, default: Date.now }
    });
    
    const Test = mongoose.model('Test', testSchema);
    
    // Insert test data
    await Test.create({ name: 'Test Entry' });
    console.log('✅ Test data created');
    console.log('✅ Database "sales_system" should now appear in MongoDB Compass');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });