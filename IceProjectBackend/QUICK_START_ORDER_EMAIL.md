# 🚀 Quick Start - Order Form Email Setup

## ⚡ TL;DR

The order form email flow is **already implemented**. Just configure these environment variables:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=orders@icemansice.com  # Optional
```

Then set admin email in Settings panel.

---

## 📋 5-Minute Setup

### 1. Get Resend API Key
- Go to https://resend.com/api-keys
- Create new API key
- Copy the key

### 2. Add to .env
```bash
cd PWA-Backend
echo "RESEND_API_KEY=re_xxxxxxxxxxxxx" >> .env
```

### 3. Set Admin Email
- Login to admin panel
- Settings → Email Settings → Order Forms Email
- Save

### 4. Test
```bash
node test-order-email-flow.js
```

### 5. Done! ✅

---

## 🎯 How It Works

```
Customer fills form → Backend validates → Sends email to admin ✉️
```

**Customer submits order** → **Admin receives email** → **Admin contacts customer**

---

## 📧 Email Recipients

- ✅ **Sent TO:** Admin email (from Settings)
- ❌ **NOT sent TO:** Customer
- 📝 **Customer info:** Included in email body

---

## 🔧 Configuration Locations

| What | Where | Default |
|------|-------|---------|
| Resend API Key | `.env` → `RESEND_API_KEY` | Required |
| From Email | `.env` → `RESEND_FROM_EMAIL` | `onboarding@resend.dev` |
| Admin Email | Admin Panel → Settings | `aqibaziz423@gmail.com` |

---

## 📁 Key Files

- `src/routes/orderForms.js` - API endpoints
- `src/services/emailService.js` - Email sending
- `src/models/SiteSettings.js` - Admin email storage
- `test-order-email-flow.js` - Test script

---

## 🧪 Quick Test

```bash
# Backend test
node test-order-email-flow.js

# API test
curl -X POST http://localhost:3000/api/orders/emergency \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Test","contactPerson":"John",...}'

# Frontend test
Visit http://localhost:3001 → Fill order form → Submit
```

---

## 📚 Full Documentation

- **ORDER_FORM_COMPLETE_REPORT.md** - Complete overview
- **ORDER_FORMS_EMAIL_GUIDE.md** - Technical guide
- **ORDER_FORM_IMPLEMENTATION_SUMMARY.md** - Implementation details

---

## ✅ Verification

```bash
# Check environment
grep RESEND .env

# Check logs
tail -f logs/combined.log | grep -i email

# Check Resend dashboard
# https://resend.com/emails
```

---

## 🚨 Common Issues

**Email not sent?**
- Check `RESEND_API_KEY` is set
- Review logs: `grep -i error logs/error.log`
- Check Resend dashboard

**Using onboarding@resend.dev?**
- Normal for testing
- For production: verify domain + set `RESEND_FROM_EMAIL`

**Form submission fails?**
- Check backend is running
- Verify API URL in frontend
- Check browser console

---

## 💡 Pro Tips

1. **Testing:** Use default `onboarding@resend.dev` for quick testing
2. **Production:** Verify domain for professional emails
3. **Monitoring:** Check Resend dashboard regularly
4. **Logs:** Monitor `logs/combined.log` for email activity
5. **Backup:** Keep admin phone number handy (407-310-5007)

---

## 📞 Support

- Resend: https://resend.com/support
- Logs: `logs/combined.log`, `logs/error.log`
- Docs: ORDER_FORMS_EMAIL_GUIDE.md

---

**Status:** ✅ Production Ready  
**Setup Time:** ⏱️ 5 minutes  
**Code Changes:** ❌ None needed
