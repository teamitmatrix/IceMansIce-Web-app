# Site Settings Management - Editable Contact Information

## Overview

The site settings feature allows administrators to manage contact information, company details, and social media links through a user-friendly admin interface. These settings are stored in MongoDB and dynamically displayed on the landing page, eliminating the need to edit code for content updates.

## Features

✅ **Editable via Admin UI** - Update contact info without touching code  
✅ **Public API** - Landing page fetches settings automatically  
✅ **Validation** - Email, phone, and required fields validated  
✅ **Real-time Updates** - Changes reflect immediately on the landing page  
✅ **Audit Trail** - Tracks who last updated settings and when  

## Architecture

### Backend Components

**Model**: `PWA-Backend/src/models/SiteSettings.js`
- Single document with key `"global"`
- Three main sections: contactInfo, companyInfo, socialMedia
- Auto-creates defaults if settings don't exist

**Routes**: `PWA-Backend/src/routes/settings.js`
- `GET /settings` - Public endpoint (used by landing page)
- `PUT /settings` - Admin-only endpoint (used by admin panel)
- `GET /settings/admin` - Full settings with metadata (admin only)

**Database Seed**: `PWA-Backend/scripts/seed-settings.js`
- Initializes default settings
- Run with: `node scripts/seed-settings.js`

### Frontend Components

**Admin Page**: `pwa-frontend/src/app/admin/settings/page.tsx`
- Form to edit contact info, company info, and social media
- Real-time validation with error messages
- Save button at top and bottom for convenience
- Accessible via admin sidebar: **Site Settings**

**Landing Page**: `pwa-frontend/src/components/landingpage/landingpage1.tsx`
- Fetches settings from `/settings` API on mount
- Falls back to default values if API fails
- Updates contact section, footer, and emergency phone dynamically

## Setup & Usage

### 1. Initial Setup (First Time)

Run the seed script to create default settings:

```bash
cd PWA-Backend
node scripts/seed-settings.js
```

Expected output:
```
✓ Default site settings created successfully!
Settings created:
{
  "contactInfo": {
    "phone": "407-310-5007",
    "email": "moe@icemansice.com",
    "address": "501 Florida Central Pkwy Unit 521952, Longwood, FL 32750-5153",
    ...
  },
  ...
}
```

### 2. Editing Settings (Admin)

1. Login to admin portal
2. Navigate to **Site Settings** in the sidebar
3. Edit the fields you want to update:
   - **Contact Information**: Phone, email, address, emergency phone, business hours
   - **Company Information**: Name, tagline, description
   - **Social Media**: Facebook, Twitter, Instagram URLs
4. Click **Save Changes**

### 3. Viewing Changes (Public)

Visit the landing page - changes will appear immediately in:
- "Connect with Us" contact section
- Emergency phone number in the CTA card
- Company name in footer
- Company description in footer

## API Reference

### GET /settings

**Public endpoint** - No authentication required

**Response:**
```json
{
  "contactInfo": {
    "phone": "407-310-5007",
    "email": "moe@icemansice.com",
    "address": "501 Florida Central Pkwy Unit 521952, Longwood, FL 32750-5153",
    "emergencyPhone": "407-310-5007",
    "hours": "Mon-Fri: 6AM-8PM, Sat-Sun: 7AM-6PM"
  },
  "companyInfo": {
    "name": "IceMan's Ice",
    "tagline": "Fresh Ice Delivered to Your Doorstep",
    "description": "Pure, clean, and crystal-clear ice blocks..."
  },
  "socialMedia": {
    "facebook": "",
    "twitter": "",
    "instagram": ""
  }
}
```

### PUT /settings

**Admin-only endpoint** - Requires Bearer token with admin role

**Request Body:**
```json
{
  "contactInfo": {
    "phone": "407-310-5007",
    "email": "moe@icemansice.com",
    "address": "501 Florida Central Pkwy Unit 521952, Longwood, FL 32750-5153",
    "emergencyPhone": "407-310-5007",
    "hours": "Mon-Fri: 6AM-8PM, Sat-Sun: 7AM-6PM"
  },
  "companyInfo": {
    "name": "IceMan's Ice",
    "tagline": "Fresh Ice Delivered to Your Doorstep",
    "description": "Pure, clean, and crystal-clear ice blocks..."
  },
  "socialMedia": {
    "facebook": "https://facebook.com/icemansice",
    "twitter": "https://twitter.com/icemansice",
    "instagram": "https://instagram.com/icemansice"
  }
}
```

**Response:**
```json
{
  "message": "Settings updated successfully",
  "settings": { ... }
}
```

## Validation Rules

- **Email**: Must be valid email format (validated by regex)
- **Phone**: Required
- **Address**: Required
- **Company Name**: Required
- All fields are trimmed of whitespace
- Email is converted to lowercase

## Database Schema

```javascript
{
  key: "global",  // Unique, ensures single settings document
  contactInfo: {
    phone: String (required),
    email: String (required, validated),
    address: String (required),
    emergencyPhone: String,
    hours: String
  },
  companyInfo: {
    name: String,
    tagline: String,
    description: String
  },
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String
  },
  updatedBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

## Environment Variables

Ensure `NEXT_PUBLIC_API_BASE_URL` is set in your frontend `.env`:

```env
NEXT_PUBLIC_API_BASE_URL=https://pwa-backend-fxw6.onrender.com
```

Or for local development:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## Troubleshooting

### Settings not appearing on landing page

1. Check browser console for fetch errors
2. Verify API is running and accessible
3. Confirm `NEXT_PUBLIC_API_BASE_URL` is set correctly
4. Check that seed script has been run (`node scripts/seed-settings.js`)

### Can't save settings in admin panel

1. Verify you're logged in as admin
2. Check that JWT token is valid
3. Look for validation errors in the form
4. Check backend logs for errors

### Settings were never created

Run the seed script:
```bash
cd PWA-Backend
node scripts/seed-settings.js
```

If settings already exist, the script will show current settings without creating duplicates.

## Future Enhancements

Potential improvements:
- Image uploads for logo and gallery
- Multiple language support
- Theme customization (colors, fonts)
- Email templates editor
- Business hours with day-specific scheduling
- Multiple contact numbers with labels
- Map integration for address

## Security Notes

- Settings update endpoint requires admin authentication
- Email validation prevents XSS via email field
- Only one settings document can exist (enforced by unique key)
- Audit trail tracks who made changes and when
- Public endpoint returns only necessary fields (no metadata)

---

**Last Updated**: October 18, 2025  
**Author**: GitHub Copilot  
**Version**: 1.0
