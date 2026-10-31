# SSL/TLS Troubleshooting Guide for QuickBooks Online Integration

## Problem: ERR_SSL_WRONG_VERSION_NUMBER Error

If you're experiencing the error `ERR_SSL_WRONG_VERSION_NUMBER` with your QuickBooks Online sync, this guide will help you resolve it.

### What This Error Means

This error occurs when there's a mismatch between the SSL/TLS protocol versions used by your application and the QuickBooks Online servers. The error typically manifests as:

```
[Error: 98BBFC1B0D7E0000:error:0A00010B:SSL routines:ssl3_get_record:wrong version number:../deps/openssl/openssl/ssl/record/ssl3_record.c:354:
] {
  library: 'SSL routines',
  reason: 'wrong version number',
  code: 'ERR_SSL_WRONG_VERSION_NUMBER'
}
```

### Root Causes

1. **Outdated HTTP Client Libraries**: The deprecated `request` library and older versions of `node-quickbooks` may use outdated SSL/TLS configurations
2. **TLS Version Mismatch**: QuickBooks Online requires TLS 1.2 or higher, but your application might be using older versions
3. **Network Interference**: Firewalls, proxies, or load balancers might be interfering with SSL handshakes

### Solution Implemented

We've updated the codebase to resolve these SSL/TLS issues:

#### 1. Replaced Deprecated Libraries
- ✅ Replaced `request` library with `axios` for OAuth token exchanges
- ✅ Added proper SSL/TLS configuration to HTTP clients
- ✅ Updated `node-quickbooks` client configuration

#### 2. Enhanced SSL/TLS Configuration
- ✅ Added configurable TLS version support
- ✅ Implemented proper SSL verification settings
- ✅ Added connection keep-alive for better performance

#### 3. Improved Error Handling
- ✅ Added specific error handling for SSL/TLS issues
- ✅ Enhanced logging with actionable error messages
- ✅ Added retry logic for transient SSL errors

### Configuration Options

Add these environment variables to your `.env` file:

```bash
# SSL/TLS Configuration for QuickBooks
QBO_SSL_VERIFY=true                    # Set to false ONLY for debugging
QBO_TLS_VERSION=TLSv1_2_method        # TLS version to use
```

### Testing Your SSL Configuration

Run the SSL test script to diagnose connection issues:

```bash
npm run test:ssl
```

This will test connections to QuickBooks API endpoints and provide recommendations.

### Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `QBO_SSL_VERIFY` | `true` | Enable/disable SSL certificate verification |
| `QBO_TLS_VERSION` | `TLSv1_2_method` | TLS protocol version to use |

### Troubleshooting Steps

#### 1. Test SSL Configuration
```bash
npm run test:ssl
```

#### 2. Check Node.js Version
Ensure you're using Node.js 18+ with modern OpenSSL:
```bash
node --version
node -p "process.versions.openssl"
```

#### 3. Verify Environment Variables
Make sure your `.env` file has the correct SSL settings:
```bash
QBO_SSL_VERIFY=true
QBO_TLS_VERSION=TLSv1_2_method
```

#### 4. Test Network Connectivity
Check if your network allows outbound HTTPS connections to QuickBooks:
```bash
curl -I https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
```

#### 5. Check for Proxy/Firewall Issues
- Ensure no corporate firewall is blocking QuickBooks API endpoints
- Verify proxy settings if you're behind a corporate network
- Check if any security software is interfering with SSL connections

### Common Solutions

#### For Corporate Networks
If you're behind a corporate firewall, you may need to:
1. Whitelist QuickBooks API domains
2. Configure proxy settings in your application
3. Contact your IT department for SSL certificate issues

#### For Development/Debugging
If you need to temporarily disable SSL verification for debugging:
```bash
QBO_SSL_VERIFY=false
```
**⚠️ WARNING: Never use this in production!**

#### For Older Node.js Versions
If you're using Node.js < 18, consider upgrading or try:
```bash
QBO_TLS_VERSION=TLSv1_method
```

### Monitoring and Logs

The updated code provides enhanced logging for SSL issues:

- SSL errors are now logged with specific error codes
- Sync history records include SSL error details
- Error messages include actionable suggestions

Check your logs for entries like:
```
QBO sync job failed due to SSL/TLS issue: SSL/TLS connection error: wrong version number
```

### Getting Help

If you continue to experience SSL issues:

1. Run `npm run test:ssl` and share the output
2. Check your Node.js and OpenSSL versions
3. Verify your network configuration
4. Contact your system administrator if behind a corporate firewall

### Security Notes

- Always keep SSL verification enabled in production
- Use the latest TLS version supported by your Node.js version
- Regularly update your dependencies to get security patches
- Monitor for SSL certificate expiration

---

For more information about QuickBooks Online API requirements, visit the [official documentation](https://developer.intuit.com/app/developer/qbo/docs/get-started).
