# Quick Status Check Commands

## Test Backend Health
```bash
curl https://pwa-backend-fxw6.onrender.com/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-18T...",
  "uptime": 123.456,
  "environment": "production"
}
```

---

## Test Settings Endpoint (No Auth Required)
```bash
curl https://pwa-backend-fxw6.onrender.com/settings
```

**Expected Response:**
```json
{
  "contactInfo": {
    "phone": "407-310-5007",
    "email": "moe@icemansice.com",
    ...
  },
  "companyInfo": {...},
  "socialMedia": {...}
}
```

---

## Test CORS Headers
```bash
curl -I -X OPTIONS https://pwa-backend-fxw6.onrender.com/settings \
  -H "Origin: https://icemansice.com" \
  -H "Access-Control-Request-Method: GET"
```

**Expected Headers:**
```
Access-Control-Allow-Origin: https://icemansice.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS,PATCH
```

---

## Browser Console Quick Test

Open https://icemansice.com, press F12, paste this in Console:

```javascript
// Test if API URL is set correctly
fetch('https://pwa-backend-fxw6.onrender.com/settings')
  .then(res => res.json())
  .then(data => {
    console.log('✅ Backend is reachable!');
    console.log('Settings:', data);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
  });
```

**Expected Console Output:**
```
✅ Backend is reachable!
Settings: { contactInfo: {...}, ... }
```

---

## Summary

🟢 **All Working** = All above commands return success  
🟡 **Partial** = Health works but settings/CORS fails → Check Render deployment  
🔴 **Not Working** = Health fails → Render service is down  

---

**Quick Check Right Now:**
1. Open: https://pwa-backend-fxw6.onrender.com/health
2. If you see `"status": "OK"` → Backend is up ✅
3. Open: https://icemansice.com
4. Press F12 → Console
5. Look for "Fetched settings" → Frontend working ✅
