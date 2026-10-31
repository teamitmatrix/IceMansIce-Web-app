require('dotenv').config();
const { sendVerificationEmail } = require('./src/services/emailService');

async function testVerificationEmail() {
  try {
    console.log('Testing verification email with config:', {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Set' : 'Not set',
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      BACKEND_URL: process.env.BACKEND_URL
    });

    const result = await sendVerificationEmail(
      'test@example.com', // Replace with your test email
      'test-verification-token-123'
    );

    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Failed to send test email:', error);
  }
}

testVerificationEmail();