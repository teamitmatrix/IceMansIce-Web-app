const { Resend } = require('resend');
const logger = require('../utils/logger');

// Initialize Resend with fallback for development
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const BACKEND_URL = process.env.BACKEND_URL;

// Initialize resend client
let resend = null;

// Helper function to initialize or get the Resend client
function getResendClient() {
  if (!resend) {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resend = new Resend(RESEND_API_KEY);
    logger.info('Resend client initialized');
  }
  return resend;
}

// Log environment status
logger.info('Email service configuration:', {
  apiKeySet: !!RESEND_API_KEY,
  fromEmail: RESEND_FROM_EMAIL,
  backendUrl: BACKEND_URL || 'not set'
});

// Helper function to send email using Resend
async function sendEmail({ to, subject, html }) {
  try {
    logger.info(`Attempting to send email to: ${to}`);
    logger.debug('Email content:', { subject, htmlLength: html.length });

    if (!RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not set - logging email instead of sending');
      logger.info('Would have sent:', { to, subject, html });
      return { success: true, mock: true };
    }

    if (!resend) {
      resend = new Resend(RESEND_API_KEY);
    }

    const { data, error } = await resend.emails.send({
      from: `IceMan's Ice <${RESEND_FROM_EMAIL}>`,
      to: [to],
      subject: subject,
      html: html
    });

    if (error) {
      logger.error('Resend API error', {
        to,
        from: RESEND_FROM_EMAIL,
        subject,
        statusCode: error.statusCode,
        name: error.name,
        message: error.message,
        error,
      });
      const err = new Error(error.message || 'Resend API error');
      err.statusCode = error.statusCode;
      err.resendError = error;
      throw err;
    }

    logger.info(`Email sent successfully to ${to}, ID: ${data.id}`);
    return { success: true, id: data.id };

  } catch (error) {
    logger.error('Failed to send email:', {
      error: error.message,
      statusCode: error.statusCode,
      resendError: error.resendError,
      stack: error.stack,
      to,
      from: RESEND_FROM_EMAIL,
      subject
    });
    throw error;
  }
}

/**
 * Send emergency ice delivery request email
 */
async function sendEmergencyOrderEmail(orderData, recipientEmail) {
  try {
    if (!recipientEmail) {
      throw new Error('Recipient email is required');
    }

    const client = getResendClient();
    logger.info('Sending emergency order email to:', recipientEmail);
    
    const { data, error } = await client.emails.send({
      from: `IceMan's Ice Orders <${RESEND_FROM_EMAIL}>`,
      to: [recipientEmail],
      subject: `🧊 Emergency Ice Delivery Request - ${orderData.companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1e40af 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .section { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; border-left: 4px solid #06b6d4; }
              .label { font-weight: bold; color: #1e40af; margin-bottom: 5px; }
              .value { margin-bottom: 15px; padding: 10px; background: #eff6ff; border-radius: 4px; }
              .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🧊 Emergency Ice Delivery Request</h1>
                <p style="margin: 10px 0 0 0;">New order received from landing page</p>
              </div>
              
              <div class="content">
                <div class="section">
                  <h2 style="color: #1e40af; margin-top: 0;">Company Information</h2>
                  <div class="label">Company Name:</div>
                  <div class="value">${orderData.companyName}</div>
                  
                  <div class="label">Contact Person:</div>
                  <div class="value">${orderData.contactPerson}</div>
                  
                  <div class="label">Phone Number:</div>
                  <div class="value"><a href="tel:${orderData.phone}">${orderData.phone}</a></div>
                  
                  ${orderData.email ? `
                  <div class="label">Email Address:</div>
                  <div class="value"><a href="mailto:${orderData.email}">${orderData.email}</a></div>
                  ` : ''}
                </div>
                
                <div class="section">
                  <h2 style="color: #1e40af; margin-top: 0;">Delivery Address</h2>
                  <div class="value">
                    ${orderData.street}<br>
                    ${orderData.city}, ${orderData.state} ${orderData.zip}
                  </div>
                </div>
                
                <div class="section">
                  <h2 style="color: #1e40af; margin-top: 0;">🔹 Delivery Details</h2>
                  <div class="label">Date of Request:</div>
                  <div class="value">${orderData.dateOfRequest}</div>
                  
                  <div class="label">Preferred Delivery Time:</div>
                  <div class="highlight">${orderData.preferredDeliveryTime}</div>
                  
                  <div class="label">Products Needed:</div>
                  <div class="value">
                    ${orderData.products && Array.isArray(orderData.products) 
                      ? orderData.products.map(p => `${p.quantity} x ${p.type}`).join('<br>') 
                      : 'N/A'}
                  </div>
                  
                  <div class="label">Storage Unit Needed:</div>
                  <div class="value">${orderData.storageUnitNeeded || 'No'}</div>
                  
                  ${orderData.specialInstructions ? `
                    <div class="label">Special Instructions:</div>
                    <div class="value">${orderData.specialInstructions}</div>
                  ` : ''}
                </div>
                
                <div class="footer">
                  <p><strong>IceMan's Ice</strong></p>
                  <p>This email was sent from the emergency order form on icemansice.com</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      logger.error('Error sending emergency order email:', {
        error: error.message,
        code: error.statusCode,
        recipientEmail
      });
      throw error;
    }

    logger.info('Emergency order email sent successfully', {
      recipientEmail,
      emailId: data.id,
      company: orderData.companyName
    });

    return { success: true, id: data.id };
  } catch (error) {
    logger.error('Failed to send emergency order email:', {
      error: error.message,
      stack: error.stack,
      recipientEmail,
      company: orderData.companyName
    });
    throw error;
  }
}

/**
 * Send regular customer order email
 */
async function sendRegularOrderEmail(orderData, recipientEmail) {
  try {
    if (!recipientEmail) {
      throw new Error('Recipient email is required');
    }
    
    const client = getResendClient();
    logger.info('Sending regular order email to:', recipientEmail);
    
    const { data, error } = await client.emails.send({
      from: `IceMan's Ice Orders <${RESEND_FROM_EMAIL}>`,
      to: [recipientEmail],
      subject: `Regular Order Request - ${orderData.name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1e40af 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .section { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; border-left: 4px solid #06b6d4; }
              .label { font-weight: bold; color: #1e40af; margin-bottom: 5px; }
              .value { margin-bottom: 15px; padding: 10px; background: #eff6ff; border-radius: 4px; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Regular Customer Order</h1>
                <p style="margin: 10px 0 0 0;">Quick order request from returning customer</p>
              </div>
              
              <div class="content">
                <div class="section">
                  <h2 style="color: #1e40af; margin-top: 0;">Customer Information</h2>
                  <div class="label">Name:</div>
                  <div class="value">${orderData.name}</div>
                  
                  <div class="label">Address:</div>
                  <div class="value">${orderData.address}</div>
                  
                  <div class="label">Phone:</div>
                  <div class="value"><a href="tel:${orderData.phone}">${orderData.phone}</a></div>
                  
                  ${orderData.email ? `
                  <div class="label">Email:</div>
                  <div class="value"><a href="mailto:${orderData.email}">${orderData.email}</a></div>
                  ` : ''}
                </div>
                
                <div class="section">
                  <h2 style="color: #1e40af; margin-top: 0;">Order Details</h2>
                  <div class="label">Products Needed:</div>
                  <div class="value">
                    ${orderData.products && Array.isArray(orderData.products) 
                      ? orderData.products.map(p => `${p.quantity} x ${p.type}`).join('<br>') 
                      : 'N/A'}
                  </div>
                  
                  <div class="label">Requested Delivery Day:</div>
                  <div class="value">${orderData.requestedDeliveryDay}</div>
                  
                  ${orderData.additionalNotes ? `
                    <div class="label">Additional Notes:</div>
                    <div class="value">${orderData.additionalNotes}</div>
                  ` : ''}
                </div>
                
                <div class="footer">
                  <p><strong>IceMan's Ice</strong></p>
                  <p>This email was sent from the regular customer form on icemansice.com</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `
    });

    if (error) {
      logger.error('Error sending regular order email:', {
        error: error,
        message: error.message,
        statusCode: error.statusCode,
        name: error.name
      });
      throw error;
    }

    logger.info(`Regular order email sent successfully. ID: ${data.id}`);
    return { success: true, id: data.id };
  } catch (error) {
    logger.error('Failed to send regular order email:', {
      error: error.message,
      stack: error.stack,
      recipientEmail
    });
    throw error;
  }
}

/**
 * Send password reset email with a one-time link
 */
async function sendPasswordResetEmail(to, resetUrl, name = 'there') {
  const subject = "Reset your IceMan's Ice password";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: #1e40af; color: white; padding: 24px; text-align: center; }
        .content { padding: 24px; background: #f9fafb; }
        .button {
          display: inline-block;
          background: #2563eb;
          color: #ffffff !important;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: bold;
          margin: 16px 0;
        }
        .footer { padding: 16px 24px; font-size: 12px; color: #6b7280; text-align: center; }
        .muted { color: #6b7280; font-size: 14px; word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin:0;">IceMan's Ice</h1>
      </div>
      <div class="content">
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
        <p style="text-align:center;">
          <a class="button" href="${resetUrl}">Reset Password</a>
        </p>
        <p class="muted">If the button doesn't work, copy and paste this link into your browser:<br>${resetUrl}</p>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        <p>This email was sent by IceMan's Ice</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html });
}

// Export the email service functions
module.exports = {
  sendEmail,
  sendEmergencyOrderEmail,
  sendRegularOrderEmail,
  sendPasswordResetEmail,
  getResendClient
};

