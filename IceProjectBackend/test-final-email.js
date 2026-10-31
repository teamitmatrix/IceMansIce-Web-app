require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

resend.emails.send({
  from: "IceMan's Ice Orders <notifications@icemansice.com>",
  to: ['aqibaziz423@gmail.com'],
  subject: '🧊 Test - Order Form Email Configuration',
  html: `
    <h1>✅ Success!</h1>
    <p>This email configuration is working correctly!</p>
    <p><strong>FROM:</strong> notifications@icemansice.com</p>
    <p><strong>TO:</strong> aqibaziz423@gmail.com</p>
    <p><strong>Time:</strong> ${new Date().toISOString()}</p>
  `
}).then(result => {
  if (result.error) {
    console.log('✗ Error:', result.error.message);
  } else {
    console.log('✓ Email sent successfully!');
    console.log('Email ID:', result.data.id);
    console.log('Check inbox at: aqibaziz423@gmail.com');
    console.log('View in Resend: https://resend.com/emails/' + result.data.id);
  }
}).catch(error => {
  console.log('✗ Unexpected Error:', error.message);
});
