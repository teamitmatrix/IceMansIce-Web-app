const mongoose = require('mongoose');
const User = require('./src/models/User');

async function checkUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/pwa_db');
    console.log('Connected to MongoDB');
    
    const email = 'aqibaziz817@gmail.com';
    console.log('Searching for email:', email);
    
    // Check exact match
    const user1 = await User.findOne({ email: email });
    console.log('Exact match found:', user1 ? 'YES' : 'NO');
    
    // Check lowercase
    const user2 = await User.findOne({ email: email.toLowerCase() });
    console.log('Lowercase match found:', user2 ? 'YES' : 'NO');
    
    // Check all users with similar email
    const users = await User.find({ email: { $regex: email, $options: 'i' } });
    console.log('Similar emails found:', users.length);
    
    if (users.length > 0) {
      users.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log('  ID:', user._id);
        console.log('  Email:', user.email);
        console.log('  Name:', user.name);
        console.log('  Role:', user.role);
        console.log('  Active:', user.isActive);
      });
    }
    
    // Also check all users to see what emails exist
    const allUsers = await User.find({}, 'email name role');
    console.log('\nAll users in database:');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name}) - ${user.role}`);
    });
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUser();