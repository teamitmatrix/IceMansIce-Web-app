# Site Settings Feature - Quick Start Guide

## What Was Built

A complete system allowing admins to edit contact information (phone, email, address) through the admin panel UI, which automatically updates the landing page without code changes.

## Files Created/Modified

### Backend (PWA-Backend)
- ✅ `src/models/SiteSettings.js` - MongoDB model for settings
- ✅ `src/routes/settings.js` - API endpoints (GET public, PUT admin)
- ✅ `src/app.js` - Registered settings route
- ✅ `scripts/seed-settings.js` - Database initialization script
- ✅ `SITE_SETTINGS_README.md` - Complete documentation

### Frontend (pwa-frontend)
- ✅ `src/app/admin/settings/page.tsx` - Admin settings editor UI
- ✅ `src/components/admin/admin-layout.tsx` - Added "Site Settings" to sidebar
- ✅ `src/components/landingpage/landingpage1.tsx` - Fetch & display dynamic settings

## How to Use (After Deployment)

### First Time Setup
```bash
# On the server, run the seed script once
node scripts/seed-settings.js
```

### Admin Usage
1. Login to admin portal at `/admin`
2. Click **Site Settings** in the sidebar
3. Edit contact information fields
4. Click **Save Changes**
5. Visit landing page - changes appear immediately!

### What Can Be Edited

**Contact Information:**
- Phone number (24/7)
- Email address
- Physical address
- Emergency phone number
- Business hours

**Company Information:**
- Company name
- Tagline
- Description

**Social Media:**
- Facebook URL
- Twitter URL  
- Instagram URL

## API Endpoints

- `GET /settings` - Public (no auth) - Landing page uses this
- `PUT /settings` - Admin only - Updates settings
- `GET /settings/admin` - Admin only - Full settings with metadata

## Testing Locally

1. **Start backend:**
   ```bash
   cd PWA-Backend
   npm start
   ```

2. **Seed database:**
   ```bash
   node scripts/seed-settings.js
   ```

3. **Start frontend:**
   ```bash
   cd pwa-frontend
   npm run dev
   ```

4. **Visit:**
   - Landing page: `http://localhost:3000`
   - Admin settings: `http://localhost:3000/admin/settings`

## Validation

- Email must be valid format
- Phone, email, address, company name are required
- Real-time validation with error messages

## Benefits

✅ No code changes needed to update contact info  
✅ Admin-friendly UI with validation  
✅ Instant updates across the site  
✅ Audit trail (tracks who updated when)  
✅ Graceful fallback to defaults if API fails  

## Security

- Settings update requires admin authentication
- Public endpoint returns only necessary data
- Input validation prevents invalid data
- Single settings document (enforced by schema)

---

**Ready for Production** ✓

The implementation is complete and production-ready. Run the seed script on your server to initialize settings, then admins can manage contact information through the UI.
