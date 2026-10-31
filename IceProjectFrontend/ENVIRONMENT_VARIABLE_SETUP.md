# 🔧 Environment Variable Setup - CRITICAL!

## ⚠️ **ROOT CAUSE OF YOUR ISSUE**

Your frontend is **NOT** set up with the backend URL environment variable!

That's why you're getting:
- ❌ `ERR_CONNECTION_REFUSED` - trying to connect to localhost
- ❌ CORS errors - requests aren't reaching the backend properly

---

## 🎯 **SOLUTION: Set Environment Variable in Vercel/Netlify**

### **Where is your frontend deployed?**

#### **Option A: Vercel**
1. Go to https://vercel.com/dashboard
2. Click on your project (`pwa-frontend` or `icemansice`)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Set:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://pwa-backend-fxw6.onrender.com`
   - **Environment**: Select all (Production, Preview, Development)
6. Click **Save**
7. **IMPORTANT**: Go to **Deployments** → Click **...** on latest → **Redeploy**

#### **Option B: Netlify**
1. Go to https://app.netlify.com
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Set:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://pwa-backend-fxw6.onrender.com`
6. Click **Save**
7. Go to **Deploys** → **Trigger deploy** → **Deploy site**

---

## 📋 **Complete Environment Variables Checklist**

### **Frontend (Vercel/Netlify) - REQUIRED**
```bash
NEXT_PUBLIC_API_URL=https://pwa-backend-fxw6.onrender.com
```

### **Backend (Render) - Already Set ✅**
```bash
FRONTEND_URL=https://icemansice.com
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
# (all other variables already configured)
```

---

## 🔍 **How to Verify It's Set Correctly**

### **Method 1: Check in Browser Console**
1. Open https://icemansice.com
2. Press F12 → Console
3. Type: `console.log(process.env.NEXT_PUBLIC_API_URL)`
4. **Should show**: `undefined` (in production, env vars aren't exposed to console)
5. **But the app should work!**

### **Method 2: Check Network Tab**
1. Open https://icemansice.com
2. Press F12 → Network tab
3. Refresh page
4. Look for requests to:
   - ✅ `https://pwa-backend-fxw6.onrender.com/settings` (CORRECT)
   - ❌ `http://localhost:3001/settings` (WRONG - means env var not set)

### **Method 3: Check Build Logs**
1. In Vercel/Netlify dashboard
2. Go to latest deployment
3. Check build logs
4. Look for environment variables being set

---

## 🚨 **Common Mistakes**

### ❌ **Mistake 1: Wrong Variable Name**
```bash
# WRONG - Won't work
NEXT_PUBLIC_API_BASE_URL=...

# CORRECT - Will work
NEXT_PUBLIC_API_URL=...
```
*(Our code now supports both, but use `NEXT_PUBLIC_API_URL` to be safe)*

### ❌ **Mistake 2: Not Redeploying**
Setting the environment variable is **NOT ENOUGH**!
You **MUST** redeploy after setting it!

### ❌ **Mistake 3: Wrong URL**
```bash
# WRONG - Missing protocol
NEXT_PUBLIC_API_URL=pwa-backend-fxw6.onrender.com

# CORRECT - With https://
NEXT_PUBLIC_API_URL=https://pwa-backend-fxw6.onrender.com
```

### ❌ **Mistake 4: Trailing Slash**
```bash
# Avoid trailing slash
NEXT_PUBLIC_API_URL=https://pwa-backend-fxw6.onrender.com/  ❌

# No trailing slash
NEXT_PUBLIC_API_URL=https://pwa-backend-fxw6.onrender.com  ✅
```

---

## 🧪 **Testing After Setup**

### **Step 1: Redeploy Frontend**
After setting the environment variable, you **MUST** trigger a new deployment!

### **Step 2: Wait for Build**
Wait 2-3 minutes for the build to complete

### **Step 3: Clear Browser Cache**
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or use incognito window

### **Step 4: Check Network Tab**
1. Open https://icemansice.com
2. F12 → Network
3. Refresh
4. Look for API requests
5. **Should see**: `https://pwa-backend-fxw6.onrender.com/...` (NOT localhost!)

### **Step 5: Test Settings**
1. Try to update settings in admin panel
2. Should work without CORS errors!

---

## 📊 **Expected Results**

### **Before Setting Env Var:**
```
❌ ERR_CONNECTION_REFUSED
❌ Failed to fetch
❌ Trying to connect to localhost:3001
❌ CORS errors
```

### **After Setting Env Var:**
```
✅ Requests go to https://pwa-backend-fxw6.onrender.com
✅ No connection refused errors
✅ CORS allows requests
✅ Everything works!
```

---

## 🆘 **Still Not Working?**

### **Debug Checklist:**

1. **Verify env var is set**
   - Check Vercel/Netlify dashboard
   - Variable name is exactly: `NEXT_PUBLIC_API_URL`
   - Value is exactly: `https://pwa-backend-fxw6.onrender.com`

2. **Verify you redeployed**
   - New deployment after setting env var
   - Build completed successfully
   - Latest deployment is live

3. **Clear all caches**
   - Browser cache (Ctrl+Shift+Delete)
   - Try incognito window
   - Try different browser

4. **Check Render backend**
   - Is it running? (check Render dashboard)
   - No errors in logs?
   - Health check working: https://pwa-backend-fxw6.onrender.com/health

5. **Check Network Tab**
   - What URL is being requested?
   - Is it localhost or Render?
   - What's the response status?

---

## 📝 **Quick Reference**

| Item | Value |
|------|-------|
| Frontend Env Var Name | `NEXT_PUBLIC_API_URL` |
| Backend URL | `https://pwa-backend-fxw6.onrender.com` |
| Frontend Domain | `https://icemansice.com` |
| Must Redeploy? | **YES!** |

---

## ✅ **Action Items**

- [ ] Go to Vercel/Netlify dashboard
- [ ] Add environment variable `NEXT_PUBLIC_API_URL`
- [ ] Set value to `https://pwa-backend-fxw6.onrender.com`
- [ ] Save the variable
- [ ] Trigger new deployment (IMPORTANT!)
- [ ] Wait for build to complete (2-3 minutes)
- [ ] Clear browser cache
- [ ] Test the site
- [ ] Check Network tab - requests should go to Render, not localhost

---

**This is the #1 issue right now!** Once you set this environment variable and redeploy, all the CORS and connection errors will be resolved! 🚀
