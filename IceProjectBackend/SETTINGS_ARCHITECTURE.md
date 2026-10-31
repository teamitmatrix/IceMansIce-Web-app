# Site Settings Architecture Flow

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SITE SETTINGS SYSTEM                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  Landing Page    │         │   Admin Panel    │         │    MongoDB       │
│  (Public)        │         │   (Admin Only)   │         │                  │
└──────────────────┘         └──────────────────┘         └──────────────────┘
        │                             │                             │
        │ GET /settings               │                             │
        │ (no auth)                   │                             │
        ├────────────────────────────►│                             │
        │                             │                             │
        │     Contact Info            │                             │
        │◄────────────────────────────┤                             │
        │                             │                             │
        │                             │ PUT /settings               │
        │                             │ (Bearer token)              │
        │                             ├────────────────────────────►│
        │                             │                             │
        │                             │    Update Success           │
        │                             │◄────────────────────────────┤
        │                             │                             │
        │ GET /settings (refresh)     │                             │
        ├────────────────────────────►│                             │
        │                             │ findOne({key:'global'})     │
        │                             ├────────────────────────────►│
        │     Updated Info            │                             │
        │◄────────────────────────────┤     Settings Document       │
        │                             │◄────────────────────────────┤
```

## Data Flow

### 1. Landing Page Load
```
User visits Landing Page
    ↓
useEffect runs on mount
    ↓
fetch(`${API_URL}/settings`)
    ↓
GET /settings endpoint (public)
    ↓
SiteSettings.getSettings()
    ↓
Returns: contactInfo, companyInfo, socialMedia
    ↓
Landing page renders with data
```

### 2. Admin Updates Settings
```
Admin logs into /admin
    ↓
Clicks "Site Settings" in sidebar
    ↓
Page fetches current settings (GET /settings/admin)
    ↓
Admin edits form fields
    ↓
Admin clicks "Save Changes"
    ↓
PUT /settings with auth token
    ↓
Middleware: authenticate + requireRole(['admin'])
    ↓
Controller validates input
    ↓
SiteSettings.updateSettings(updates, userId)
    ↓
MongoDB saves changes
    ↓
Returns success message
    ↓
Toast notification shows success
```

### 3. Landing Page Auto-Update
```
User visits/refreshes Landing Page
    ↓
fetch(`${API_URL}/settings`)
    ↓
API returns latest settings from MongoDB
    ↓
React state updates
    ↓
UI re-renders with new contact info
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│  Collection: sitesettings                                   │
│  Document: { key: "global" } (unique)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  {                                                          │
│    key: "global",                                          │
│    contactInfo: {                                          │
│      phone: "407-310-5007",                               │
│      email: "moe@icemansice.com",                         │
│      address: "501 Florida Central Pkwy...",              │
│      emergencyPhone: "407-310-5007",                      │
│      hours: "Mon-Fri: 6AM-8PM, Sat-Sun: 7AM-6PM"         │
│    },                                                      │
│    companyInfo: {                                          │
│      name: "IceMan's Ice",                                │
│      tagline: "Fresh Ice Delivered...",                   │
│      description: "Pure, clean, and crystal-clear..."     │
│    },                                                      │
│    socialMedia: {                                          │
│      facebook: "",                                        │
│      twitter: "",                                         │
│      instagram: ""                                        │
│    },                                                      │
│    updatedBy: ObjectId("..."),  // Who last updated       │
│    createdAt: ISODate("..."),                             │
│    updatedAt: ISODate("...")                              │
│  }                                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Backend Structure
```
PWA-Backend/
├── src/
│   ├── models/
│   │   └── SiteSettings.js        ← Schema + static methods
│   ├── routes/
│   │   └── settings.js            ← GET/PUT endpoints
│   ├── middleware/
│   │   ├── auth.js                ← JWT verification
│   │   └── rbac.js                ← Role check (admin)
│   └── app.js                     ← Register /settings route
└── scripts/
    └── seed-settings.js           ← Initialize defaults
```

### Frontend Structure
```
pwa-frontend/
└── src/
    ├── app/
    │   └── admin/
    │       └── settings/
    │           └── page.tsx       ← Admin editor form
    ├── components/
    │   ├── admin/
    │   │   └── admin-layout.tsx   ← Sidebar nav (added link)
    │   └── landingpage/
    │       └── landingpage1.tsx   ← Fetch & display settings
    └── lib/
        └── axios.ts               ← API client with auth
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Request to PUT /settings                                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: authenticate middleware                           │
│  • Checks Bearer token                                      │
│  • Verifies JWT signature                                   │
│  • Attaches user to req.user                                │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: requireRole(['admin']) middleware                 │
│  • Checks req.user.role === 'admin'                         │
│  • Returns 403 if not admin                                 │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Input validation                                  │
│  • Email format check                                       │
│  • Required fields validation                               │
│  • Sanitization (trim, lowercase email)                     │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Database constraints                              │
│  • Unique key ensures single document                       │
│  • Schema validation (Mongoose)                             │
│  • Audit trail (updatedBy)                                  │
└─────────────────────────────────────────────────────────────┘
                        ↓
                   Success ✓
```

## UI Preview

### Landing Page Contact Section (Before/After)

**Before (Hardcoded):**
```tsx
<p>Phone: 407-310-5007</p>
<p>Email: moe@icemansice.com</p>
```

**After (Dynamic):**
```tsx
<p>Phone: {settings.contactInfo.phone}</p>
<p>Email: {settings.contactInfo.email}</p>
```

### Admin Settings Page UI
```
┌────────────────────────────────────────────────────────────┐
│  Site Settings                            [Save Changes]   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  📞 Contact Information                                    │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Phone Number *          [407-310-5007           ]   │ │
│  │ Emergency Phone         [407-310-5007           ]   │ │
│  │ Email Address *         [moe@icemansice.com     ]   │ │
│  │ Address *               [501 Florida Central... ]   │ │
│  │ Business Hours          [Mon-Fri: 6AM-8PM...    ]   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  🏢 Company Information                                    │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Company Name *          [IceMan's Ice           ]   │ │
│  │ Tagline                 [Fresh Ice Delivered... ]   │ │
│  │ Description             [Pure, clean, and...    ]   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  🌐 Social Media                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Facebook URL            [https://facebook.com/  ]   │ │
│  │ Twitter URL             [https://twitter.com/   ]   │ │
│  │ Instagram URL           [https://instagram.com/ ]   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│                              [Save All Changes]            │
└────────────────────────────────────────────────────────────┘
```

## State Management

### Frontend State Flow
```
Landing Page Component
    │
    ├─ useState(settings)           ← Holds fetched data
    │
    ├─ useEffect(() => {            ← Runs on mount
    │     fetchSettings()
    │  }, [])
    │
    └─ Render with {settings.contactInfo.phone}

Admin Settings Component
    │
    ├─ useState(settings)           ← Form data
    ├─ useState(loading)            ← Loading state
    ├─ useState(saving)             ← Save state
    ├─ useState(formErrors)         ← Validation errors
    │
    ├─ useEffect(() => {            ← Runs on mount
    │     fetchSettings()
    │  }, [])
    │
    ├─ handleSave()                 ← PUT /settings
    │     └─ Validates
    │     └─ Saves
    │     └─ Shows toast
    │
    └─ Render form with controlled inputs
```

---

**This architecture ensures:**
- ✅ Separation of concerns (public vs admin)
- ✅ Security (authentication + authorization)
- ✅ Single source of truth (MongoDB)
- ✅ Real-time updates (fetch on every page load)
- ✅ Graceful degradation (falls back to defaults)
