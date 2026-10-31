require('dotenv').config();
const { Resend } = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

console.log('Config:', {
  RESEND_API_KEY: !!RESEND_API_KEY,
  RESEND_FROM_EMAIL,
  BACKEND_URL: process.env.BACKEND_URL
});

async function testResend() {
  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    console.log('Initializing Resend...');
    const resend = new Resend(RESEND_API_KEY);

    console.log('Sending test email...');
    const { data, error } = await resend.emails.send({
      from: `IceMan's Ice <${RESEND_FROM_EMAIL}>`,
      to: ['icemansice@gmail.com'],
      subject: 'Email Verification Test - IceMan\'s Ice',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .button { 
                display: inline-block;
                background: #4CAF50;
                color: white;
                padding: 12px 25px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Test Email - IceMan's Ice</h2>
              <p>This is a test email to verify the email service is working correctly.</p>
              <p>Time sent: ${new Date().toISOString()}</p>
            </div>
          </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend API error:', error);
      throw error;
    }

    console.log('Email sent successfully:', data);
  } catch (error) {
    console.error('Failed to send email:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

testResend();