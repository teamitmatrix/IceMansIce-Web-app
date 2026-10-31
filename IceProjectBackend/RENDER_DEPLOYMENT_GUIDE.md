# Render Deployment Guide - SSL Fix for QuickBooks Integration

## 🚀 Quick Fix for SSL Errors on Render

If you're experiencing `ERR_SSL_WRONG_VERSION_NUMBER` errors on Render, follow these steps:

### 1. Set Environment Variables in Render Dashboard

Go to your Render service dashboard → Environment and add these variables:

```bash
# Required for SSL fix
NODE_ENV=production
RENDER=true
QBO_TLS_VERSION=TLS_method
QBO_SSL_VERIFY=true

# Your existing variables
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
QBO_CLIENT_ID=your-qbo-client-id
QBO_CLIENT_SECRET=your-qbo-client-secret
QBO_REDIRECT_URI=https://your-app.onrender.com/qbo/oauth/callback
QBO_ENVIRONMENT=sandbox
QBO_SCOPE=com.intuit.quickbooks.accounting

# Optional: Redis for background jobs
REDIS_URL=your-redis-url
QUEUES_ENABLED=true
```

### 2. Render Service Configuration

**Build Command:**
```bash
npm ci
```

**Start Command:**
```bash
npm start
```

**Node Version:** 18.x

### 3. Verify SSL Configuration

After deployment, test the SSL configuration:

```bash
# Test locally with Render settings
RENDER=true NODE_ENV=production node test-render-ssl.js
```

### 4. Monitor Logs

Check Render logs for SSL errors. You should see:
- ✅ Cloud platform detected: true
- ✅ SSL configuration working
- No more `ERR_SSL_WRONG_VERSION_NUMBER` errors

## 🔧 What This Fix Does

1. **Enhanced Cloud Detection**: Detects Render environment automatically
2. **Optimized SSL Configuration**: Uses `TLS_method` for maximum compatibility
3. **Extended Timeouts**: 60-second timeouts for cloud platforms
4. **Enhanced Cipher Suites**: Cloud-compatible cipher suites
5. **Connection Pooling**: Optimized connection settings for cloud

## 🐛 Troubleshooting

### If SSL errors persist:

1. **Check Environment Variables**:
   ```bash
   # Verify these are set in Render
   echo $NODE_ENV    # Should be: production
   echo $RENDER      # Should be: true
   echo $QBO_TLS_VERSION  # Should be: TLS_method
   ```

2. **Test SSL Configuration**:
   ```bash
   # Run the SSL test
   npm run test:ssl
   ```

3. **Check Render Logs**:
   - Look for "Cloud platform detected: true"
   - Look for SSL connection success messages
   - Check for any remaining SSL errors

4. **Verify QuickBooks Endpoints**:
   - Test OAuth endpoints manually
   - Check if QuickBooks sync jobs are working

### Common Issues:

**Issue**: Still getting SSL errors
**Solution**: Ensure `RENDER=true` is set in environment variables

**Issue**: QuickBooks sync failing
**Solution**: Check if `QUEUES_ENABLED=true` and Redis is configured

**Issue**: OAuth callback not working
**Solution**: Verify `QBO_REDIRECT_URI` matches your Render URL

## 📋 Deployment Checklist

- [ ] Environment variables set in Render dashboard
- [ ] Build and start commands configured
- [ ] Node.js version set to 18.x
- [ ] SSL test passes locally with Render settings
- [ ] QuickBooks OAuth flow working
- [ ] Background sync jobs running
- [ ] No SSL errors in logs

## 🔄 After Deployment

1. **Test QuickBooks Integration**:
   - Navigate to `/admin/quickbooks`
   - Complete OAuth flow
   - Test customer sync

2. **Monitor Background Jobs**:
   - Check if sync jobs are running
   - Monitor Redis connection
   - Verify no SSL errors in job logs

3. **Verify SSL Configuration**:
   - Run SSL test script
   - Check all QuickBooks endpoints
   - Confirm cloud platform detection

## 📞 Support

If issues persist:
1. Check Render logs for detailed error messages
2. Run the SSL test script and share results
3. Verify all environment variables are set correctly
4. Contact support with specific error messages

---

**Note**: This fix is specifically designed for Render.com deployment and addresses the `ERR_SSL_WRONG_VERSION_NUMBER` error commonly seen with QuickBooks Online integration on cloud platforms.
