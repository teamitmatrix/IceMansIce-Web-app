# Render SSL Fix for QuickBooks Integration

## Problem
The QBO sync worker was experiencing `ERR_SSL_WRONG_VERSION_NUMBER` errors specifically on Render.com production servers, while working fine locally.

## Root Cause Analysis
1. **Environment Differences**: Render.com uses different Node.js/OpenSSL versions and configurations
2. **Network Infrastructure**: Render's network may have different SSL/TLS requirements
3. **Proxy/Load Balancer**: Render's infrastructure may interfere with SSL handshakes
4. **Timeout Issues**: Network latency on cloud platforms requires longer timeouts

## Solution Implemented

### 1. Cloud Platform Detection
```javascript
const isCloudPlatform = process.env.NODE_ENV === 'production' && 
                       (process.env.RENDER || process.env.HEROKU || process.env.VERCEL);
```

### 2. Adaptive SSL Configuration
- **Local Development**: Uses `TLSv1_2_method` with modern cipher suites
- **Cloud Platforms**: Uses `TLS_method` with broader cipher compatibility

### 3. Enhanced Cipher Suites for Cloud
```javascript
ciphers: isCloudPlatform ? [
  'ECDHE-RSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES256-GCM-SHA384',
  'ECDHE-RSA-AES128-SHA256',
  'ECDHE-RSA-AES256-SHA384',
  'AES128-GCM-SHA256',
  'AES256-GCM-SHA384',
  'AES128-SHA256',
  'AES256-SHA256',
  'ECDHE-RSA-AES128-SHA',      // Added for cloud compatibility
  'ECDHE-RSA-AES256-SHA',      // Added for cloud compatibility
  'AES128-SHA',                // Added for cloud compatibility
  'AES256-SHA'                 // Added for cloud compatibility
].join(':') : [
  // Modern ciphers for local development
]
```

### 4. Extended Timeouts for Cloud Platforms
```javascript
timeout: isCloudPlatform ? 60000 : 30000, // 60s for cloud, 30s for local
```

### 5. Enhanced Connection Pooling
```javascript
...(isCloudPlatform && {
  timeout: 60000,
  maxSockets: 50,
  maxFreeSockets: 10,
})
```

### 6. Request Method Override for node-quickbooks
For cloud platforms, we override the request method to ensure SSL configuration is always applied:

```javascript
if (isCloudPlatform) {
  const originalRequest = qbo.request;
  qbo.request = function(options, callback) {
    const enhancedOptions = {
      ...options,
      agent: httpsAgent,
      timeout: 60000,
      strictSSL: config.quickbooks.sslVerify,
      headers: {
        'User-Agent': 'PWA-API/1.0.0 (Node.js)',
        'Accept': 'application/json',
        ...options.headers
      }
    };
    
    return originalRequest.call(this, enhancedOptions, callback);
  };
}
```

## Files Modified

1. **src/services/quickbooksService.js**
   - Added cloud platform detection
   - Implemented adaptive SSL configuration
   - Enhanced timeout and connection settings
   - Added request method override for node-quickbooks

2. **src/config/index.js**
   - Updated TLS version selection logic
   - Automatic cloud platform detection

## Environment Variables

### For Render.com
Set these environment variables in your Render dashboard:

```bash
NODE_ENV=production
QBO_SSL_VERIFY=true
QBO_TLS_VERSION=TLS_method
```

### Optional: Force Cloud Mode
If you want to force cloud-compatible settings locally for testing:

```bash
RENDER=true
NODE_ENV=production
```

## Testing

### Local Testing with Cloud Settings
```bash
RENDER=true NODE_ENV=production node test-ssl-config.js
```

### Production Testing
1. Deploy to Render with the updated code
2. Monitor logs for SSL errors
3. Test QBO sync operations

## Expected Results

After implementing this fix:
- ✅ SSL connections should work on Render.com
- ✅ QBO sync worker should connect successfully
- ✅ No more `ERR_SSL_WRONG_VERSION_NUMBER` errors
- ✅ Improved reliability with extended timeouts

## Monitoring

Watch for these indicators of success:
- No SSL error messages in logs
- Successful QBO API connections
- Completed sync operations
- Reduced connection timeouts

## Troubleshooting

If issues persist on Render:

1. **Check Environment Variables**
   ```bash
   NODE_ENV=production
   QBO_SSL_VERIFY=true
   QBO_TLS_VERSION=TLS_method
   ```

2. **Verify Node.js Version**
   Ensure Render is using Node.js 18+ (check in Render dashboard)

3. **Check Network Connectivity**
   Test if Render can reach QuickBooks endpoints:
   ```bash
   curl -I https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
   ```

4. **Review Render Logs**
   Look for any network or SSL-related errors

5. **Contact Render Support**
   If the issue persists, contact Render support for platform-specific SSL issues

## Deployment Checklist

- [ ] Code deployed to Render
- [ ] Environment variables set correctly
- [ ] Application restarted
- [ ] SSL errors monitored
- [ ] QBO sync tested
- [ ] Logs reviewed for success

## Rollback Plan

If the fix causes issues:
1. Revert to previous SSL configuration
2. Set `QBO_TLS_VERSION=TLSv1_2_method`
3. Remove cloud platform detection
4. Restart application

## Future Improvements

1. **Monitoring**: Add SSL connection metrics
2. **Retry Logic**: Implement exponential backoff for SSL errors
3. **Circuit Breaker**: Add circuit breaker pattern for failing SSL connections
4. **Health Checks**: Add SSL connectivity health checks
