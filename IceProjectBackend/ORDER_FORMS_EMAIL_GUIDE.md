# Order Forms Email Integration Guide

## Overview

The IceMan's Ice application includes an automated email notification system for order forms submitted through the landing page. When customers submit emergency or regular orders, the system automatically sends formatted email notifications to the admin.

## Email Flow

```
Customer fills order form on landing page
           ↓
Submit button clicked
           ↓
POST request to /api/orders/emergency or /api/orders/regular
           ↓
Backend validates form data
           ↓
Retrieves admin email from Site Settings
           ↓
Sends formatted email via Resend service
           ↓
Admin receives order notification
```

## Configuration

### 1. Environment Variables

Add the following to your `.env` file:

```env
# Email Configuration (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=orders@icemansice.com
```

**Important Notes:**
- `RESEND_API_KEY`: Your Resend API key from https://resend.com/api-keys
- `RESEND_FROM_EMAIL`: Must be a verified domain email (e.g., orders@icemansice.com)
- For testing, the system falls back to `onboarding@resend.dev` if not set

### 2. Admin Email Configuration

The admin email address is configured through the **Site Settings** interface:

1. Log in to the admin panel
2. Navigate to **Settings** → **Email Settings**
3. Set the **Order Forms Email** field to your admin email address
4. Click **Save Settings**

**Default Admin Email:** `aqibaziz423@gmail.com` (fallback if not configured)

### 3. Verify Your Domain in Resend

To use a custom email address (e.g., orders@icemansice.com):

1. Go to https://resend.com/domains
2. Add your domain (icemansice.com)
3. Add the DNS records provided by Resend to your domain registrar
4. Wait for verification (usually a few minutes to an hour)
5. Update `RESEND_FROM_EMAIL` in your `.env` file

## API Endpoints

### Emergency Order Form

**Endpoint:** `POST /api/orders/emergency`

**Request Body:**
```json
{
  "companyName": "ABC Restaurant",
  "contactPerson": "John Doe",
  "phone": "407-123-4567",
  "email": "john@abcrestaurant.com",
  "street": "123 Main Street",
  "city": "Orlando",
  "state": "FL",
  "zip": "32801",
  "dateOfRequest": "2025-10-20",
  "preferredDeliveryTime": "10:00 AM - 12:00 PM",
  "typeOfIce": "Block Ice",
  "quantityNeeded": "500 lbs",
  "storageUnitNeeded": "Yes",
  "specialInstructions": "Please call before delivery"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Your emergency ice delivery request has been submitted successfully! We'll contact you shortly."
}
```

### Regular Order Form

**Endpoint:** `POST /api/orders/regular`

**Request Body:**
```json
{
  "name": "John Doe",
  "address": "123 Main St, Orlando, FL 32801",
  "phone": "407-123-4567",
  "email": "john@example.com",
  "productType": "Block Ice - 10lb",
  "requestedDeliveryDay": "Monday",
  "additionalNotes": "Deliver to back entrance"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Your order request has been submitted successfully! We'll process it shortly."
}
```

## Email Templates

### Emergency Order Email

The emergency order email includes:
- **Header**: Branded with gradient background and ice emoji
- **Company Information**: Name, contact person, phone, email
- **Delivery Address**: Full formatted address
- **Delivery Details**: 
  - Date of request
  - Preferred delivery time (highlighted)
  - Type of ice needed
  - Quantity needed
  - Storage unit requirements
  - Special instructions (if provided)
- **Footer**: Company branding and source information

### Regular Order Email

The regular order email includes:
- **Header**: Branded with gradient background
- **Customer Information**: Name, address, phone, email
- **Order Details**:
  - Product type
  - Requested delivery day
  - Additional notes (if provided)
- **Footer**: Company branding and source information

## Email Service Implementation

The email service is located at `src/services/emailService.js` and provides two main functions:

### `sendEmergencyOrderEmail(orderData, recipientEmail)`

Sends a beautifully formatted emergency order notification.

**Parameters:**
- `orderData` (Object): The order form data
- `recipientEmail` (String): Admin email address

**Returns:** `Promise<{success: boolean, id: string}>`

### `sendRegularOrderEmail(orderData, recipientEmail)`

Sends a beautifully formatted regular order notification.

**Parameters:**
- `orderData` (Object): The order form data
- `recipientEmail` (String): Admin email address

**Returns:** `Promise<{success: boolean, id: string}>`

## Error Handling

### Email Sending Failures

If email sending fails:
1. The error is logged with full details
2. A 500 status code is returned to the frontend
3. User receives a message to call directly: **407-310-5007**

### Common Issues and Solutions

#### Issue: "RESEND_API_KEY is required for email service"
**Solution:** Add `RESEND_API_KEY` to your `.env` file

#### Issue: Emails not being delivered
**Solutions:**
1. Verify your domain in Resend
2. Check spam folder
3. Ensure `RESEND_FROM_EMAIL` uses a verified domain
4. Review Resend dashboard for delivery logs

#### Issue: Using onboarding@resend.dev
**Solution:** This is normal for testing. Add `RESEND_FROM_EMAIL` with a verified domain for production

## Testing

### Manual Testing

1. **Test Emergency Order:**
```bash
curl -X POST http://localhost:3000/api/orders/emergency \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Company",
    "contactPerson": "Test User",
    "phone": "407-123-4567",
    "email": "test@example.com",
    "street": "123 Test St",
    "city": "Orlando",
    "state": "FL",
    "zip": "32801",
    "dateOfRequest": "2025-10-20",
    "preferredDeliveryTime": "Morning",
    "typeOfIce": "Block Ice",
    "quantityNeeded": "100 lbs",
    "storageUnitNeeded": "No"
  }'
```

2. **Test Regular Order:**
```bash
curl -X POST http://localhost:3000/api/orders/regular \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "address": "123 Test St, Orlando, FL",
    "phone": "407-123-4567",
    "email": "test@example.com",
    "productType": "Block Ice",
    "requestedDeliveryDay": "Monday"
  }'
```

### Checking Email Logs

The application logs all email operations:

```bash
# View email-related logs
grep -i "email" logs/combined.log

# View only errors
grep -i "error.*email" logs/error.log
```

## Production Checklist

Before deploying to production:

- [ ] Add `RESEND_API_KEY` to production environment variables
- [ ] Verify domain in Resend
- [ ] Set `RESEND_FROM_EMAIL` to verified domain email
- [ ] Configure admin email in Site Settings
- [ ] Test email delivery from production environment
- [ ] Set up email monitoring/alerts in Resend dashboard
- [ ] Add admin email to team's shared inbox
- [ ] Document emergency contact procedures

## Security Considerations

1. **API Key Protection**: Never commit `RESEND_API_KEY` to version control
2. **Email Validation**: All emails are validated before processing
3. **Rate Limiting**: Consider adding rate limiting to prevent abuse
4. **Input Sanitization**: All inputs are validated and sanitized
5. **Error Handling**: Errors don't expose sensitive information to users

## Monitoring and Maintenance

### Resend Dashboard

Monitor email delivery through the Resend dashboard:
- https://resend.com/emails

Check:
- Delivery status
- Open rates
- Bounce rates
- Failed deliveries

### Application Logs

Monitor application logs for:
- Email sending attempts
- Failed deliveries
- API errors
- Configuration issues

### Recommended Alerts

Set up alerts for:
- Email delivery failures (>5% failure rate)
- API key expiration
- High volume of submissions (potential spam)
- Resend API downtime

## Support

For issues with:
- **Resend Service**: https://resend.com/support
- **Application Issues**: Contact development team
- **Emergency Orders**: Call 407-310-5007

## Appendix

### Sample Email Output (HTML)

The emails include:
- Responsive design for mobile and desktop
- Professional gradient header (blue theme)
- Clearly formatted sections
- Highlighted important information
- Clickable phone numbers and email addresses
- Professional footer with branding

### Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RESEND_API_KEY` | Yes | None | Resend API key for authentication |
| `RESEND_FROM_EMAIL` | No | `onboarding@resend.dev` | Sender email address (must be verified) |

### Site Settings Reference

| Setting Path | Type | Default | Description |
|--------------|------|---------|-------------|
| `emailSettings.orderFormsEmail` | String | `aqibaziz423@gmail.com` | Admin email to receive order notifications |
