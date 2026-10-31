# ✅ Admin Email Updated

## Changes Made

The fallback admin email has been updated from `aqibaziz423@gmail.com` to `moe@icemansice.com`.

## Updated Files

### Code Files (✅ Updated):
1. **src/routes/orderForms.js**
   - Emergency order endpoint fallback: `moe@icemansice.com`
   - Regular order endpoint fallback: `moe@icemansice.com`

2. **src/models/SiteSettings.js**
   - Database default: `moe@icemansice.com`

### Where This Email is Used

**Default Recipient:** When no admin email is configured in Settings, order form emails will be sent to **`moe@icemansice.com`**

**Configuration Priority:**
1. **First:** Email from Settings panel (`emailSettings.orderFormsEmail`)
2. **Fallback:** `moe@icemansice.com` (if Settings not configured)

## How It Works

```javascript
// In src/routes/orderForms.js
const settings = await SiteSettings.getSettings();
const recipientEmail = settings.emailSettings?.orderFormsEmail || "moe@icemansice.com";
```

**Logic:**
- If admin sets email in Settings → use that email
- If not set → use `moe@icemansice.com`

## To Change Admin Email

You can configure the admin email via:

### Option 1: Admin Panel (Recommended)
1. Login to admin panel
2. Settings → Email Settings
3. Update "Order Forms Email"
4. Save

### Option 2: It Will Use Default
If you don't configure anything, emails will automatically go to **`moe@icemansice.com`**

## Summary

✅ **NEW Default Admin Email:** `moe@icemansice.com`  
✅ **Files Updated:** Routes and Model  
✅ **No Restart Needed:** Works on next order submission  
✅ **Configurable:** Can be changed via Settings panel  

**Note:** Documentation files (.md) still reference the old email in examples, but the actual code now uses `moe@icemansice.com`.
