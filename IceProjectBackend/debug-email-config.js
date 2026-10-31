/**
 * Debug Email Configuration and Test Sending
 * Run: node debug-email-config.js
 */

require('dotenv').config();
const { Resend } = require('resend');

console.log('=== Email Configuration Debug ===\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log('   RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✓ Set (length: ' + process.env.RESEND_API_KEY.length + ')' : '✗ Not set');
console.log('   RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || '(not set, will use fallback)');
console.log('');

// Check email format
if (process.env.RESEND_FROM_EMAIL) {
  const email = process.env.RESEND_FROM_EMAIL;
  console.log('2. Email Format Analysis:');
  console.log('   Email:', email);
  console.log('   Length:', email.length);
  console.log('   Has @ symbol:', email.includes('@'));
  console.log('   @ character code:', email.charCodeAt(email.indexOf('@')));
  console.log('   Expected @ code: 64 (should match above)');
  console.log('   Valid format:', /^\S+@\S+\.\S+$/.test(email) ? '✓ Valid' : '✗ Invalid');
  console.log('   Hex dump:', Buffer.from(email).toString('hex'));
  console.log('');
}

// Test Resend connection
console.log('3. Testing Resend Connection:');
if (!process.env.RESEND_API_KEY) {
  console.log('   ✗ Cannot test - RESEND_API_KEY not set');
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'moe@icemansice.com';
    const toEmail = 'moe@icemansice.com';
    
    console.log('   Attempting to send test email...');
    console.log('   FROM:', fromEmail);
    console.log('   TO:', toEmail);
    console.log('');
    
    const { data, error } = await resend.emails.send({
      from: `IceMan's Ice Test <${fromEmail}>`,
      to: [toEmail],
      subject: 'Test Email - Configuration Debug',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify configuration.</p>
        <p><strong>From Email:</strong> ${fromEmail}</p>
        <p><strong>To Email:</strong> ${toEmail}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      `,
    });

    if (error) {
      console.log('   ✗ Email Send Failed!');
      console.log('   Error Name:', error.name);
      console.log('   Error Message:', error.message);
      console.log('   Status Code:', error.statusCode);
      console.log('   Full Error:', JSON.stringify(error, null, 2));
      
      // Check for specific error types
      if (error.message.includes('not verified')) {
        console.log('\n   💡 Solution: Verify your domain or FROM email in Resend dashboard');
      } else if (error.message.includes('Invalid')) {
        console.log('\n   💡 Solution: Check email format - there may be hidden characters');
      } else if (error.message.includes('bounce')) {
        console.log('\n   💡 Solution: The FROM email may not exist as a real mailbox');
      }
    } else {
      console.log('   ✓ Email Sent Successfully!');
      console.log('   Email ID:', data.id);
      console.log('   Check delivery status at: https://resend.com/emails/' + data.id);
      console.log('');
      console.log('   Note: Email was SENT, but may still bounce on delivery.');
      console.log('   Check Resend dashboard in a few minutes for delivery status.');
    }
  } catch (error) {
    console.log('   ✗ Unexpected Error!');
    console.log('   Error:', error.message);
    console.log('   Stack:', error.stack);
  }
}

testEmail();
