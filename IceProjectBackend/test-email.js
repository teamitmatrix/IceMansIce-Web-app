require('dotenv').config();
const logger = require('./src/utils/logger');
const { sendVerificationEmail } = require('./src/services/emailService');

async function testEmail() {
  try {
    logger.info('Environment check:', {
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      BACKEND_URL: process.env.BACKEND_URL
    });

    const testEmail = 'test@example.com'; // Replace with your test email
    const testToken = 'test-token-123';

    const result = await sendVerificationEmail(testEmail, testToken);
    logger.info('Test email sent:', result);
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
});

testEmail().catch(error => {
  logger.error('Test failed with error:', {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});