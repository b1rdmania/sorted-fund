# Sorted.fund - Deployment Guide
## Multi-Tenant Production Deployment

**Date:** 2026-01-16
**Status:** Phase 1-3 Complete (Backend + Frontend Auth)
**Ready For:** Local Testing → Production Deployment

---

## 🎉 What's Been Built

### ✅ Complete Systems

1. **Multi-Tenant Database Schema**
   - `developers` table with email/password auth
   - `developer_sessions` for 7-day sessions
   - `credit_transactions` audit trail (all credit operations logged)
   - `developer_projects` linkage (developers can own multiple projects)
   - Credit system: 1 credit = 1 wei (off-chain accounting)

2. **Backend Authentication (Express + PostgreSQL)**
   - POST `/auth/register` - Create developer account
   - POST `/auth/login` - Login with email/password (returns session token)
   - POST `/auth/logout` - Invalidate session
   - GET `/auth/me` - Get current developer
   - Session tokens: 64-char hex (crypto.randomBytes)
   - Passwords: bcrypt hashed (10 rounds)
   - Cookies + Bearer token support (dual auth for flexibility)

3. **Credit System (Atomic Transactions)**
   - `creditService.deduct()` - Reserve credits (authorization)
   - `creditService.refund()` - Refund unused credits (reconciliation)
   - `creditService.deposit()` - Add credits (future: Stripe integration)
   - All operations are atomic with PostgreSQL transactions
   - Full audit trail in `credit_transactions` table

4. **Updated Authorization Flow**
   - Old: Reserve from project gas tank
   - New: Deduct from developer credit balance
   - Gas reconciliation: Refund difference (maxCost - actualCost)
   - Credit balance shared across all developer projects

5. **Frontend Authentication**
   - `/login.html` - Beautiful login/register page (tabbed UI)
   - `/assets/js/auth.js` - Session management utilities
   - `/assets/js/api.js` - Auto-inject session tokens, handle 401 redirects
   - Demo account: `demo@sorted.fund` / `demo123` (1 ETH credits)

---

## 📦 Database Migrations

Run migrations to set up the database:

```bash
cd /Users/andy/Cursor\ Projects\ 2026/Sorted/backend
npm run migrate
```

**Migrations created:**
- `001_add_developers.sql` - Developers, sessions, credit system
- `005_add_developer_to_sponsorship.sql` - Link sponsorships to developers

**Demo Account:**
- Email: `demo@sorted.fund`
- Password: `demo123`
- Credits: 1 ETH (1000000000000000000 wei)

---

## 🚀 Local Development

### Start All Services

**Terminal 1 - Backend:**
```bash
cd /Users/andy/Cursor\ Projects\ 2026/Sorted/backend
npm run dev
```
→ http://localhost:3000

**Terminal 2 - Frontend:**
```bash
cd /Users/andy/Cursor\ Projects\ 2026/Sorted/frontend/dashboard-v2
python3 -m http.server 8081
```
→ http://localhost:8081

**Terminal 3 - Alto Bundler (for E2E tests):**
```bash
cd /Users/andy/Cursor\ Projects\ 2026/Sorted/bundler/alto
./alto --config config.sonic-testnet.json --floor-max-fee-per-gas 2 --floor-max-priority-fee-per-gas 2
```
→ http://localhost:4337

### Test Authentication

**1. Login via API:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@sorted.fund","password":"demo123"}'
```

**2. Login via UI:**
- Open http://localhost:8081/login.html
- Enter: `demo@sorted.fund` / `demo123`
- Should redirect to dashboard with session

**3. Test Authorization Flow:**
```bash
cd /Users/andy/Cursor\ Projects\ 2026/Sorted/sdk
npx ts-node test-e2e-alto.ts
```

---

## 🔑 API Changes

### Old Authorization Flow (Gas Tank)
```javascript
// Reserve from project gas tank
await projectService.reserveFunds(projectId, maxCost);

// No refund (gas tank stays reserved)
```

### New Authorization Flow (Credits)
```javascript
// Deduct from developer credits
await creditService.deduct(developerId, maxCost, 'sponsorship_event', eventId);

// After transaction: Refund unused
const actualCost = actualGas * gasPrice;
const refund = maxCost - actualCost;
await creditService.refund(developerId, refund, 'sponsorship_event', eventId);
```

### Updated Endpoints

**POST `/sponsor/authorize` (Changed)**
- Now requires `developer_id` from API key's project
- Checks developer credit balance (not project gas tank)
- Deducts credits immediately (refunded after reconciliation)
- Returns same `paymasterAndData` format

**POST `/sponsor/reconcile` (Enhanced)**
- Now auto-refunds unused credits to developer
- Calculates: `refund = maxCost - (actualGas * gasPrice)`
- Logs refund amount in console

**All other endpoints:** Unchanged (backward compatible)

---

## 🎨 Frontend Changes

### New Pages

1. **login.html** - Login/Register page
   - Tabbed interface (Login | Register)
   - Form validation
   - Session token storage
   - Auto-redirect if already logged in

### Updated Utilities

1. **assets/js/auth.js** - Auth utilities
   ```javascript
   Auth.isAuthenticated()         // Check if logged in
   Auth.requireAuth()             // Redirect to login if not authenticated
   Auth.getDeveloper()            // Get current developer object
   Auth.login(email, password)    // Login
   Auth.logout()                  // Logout and clear session
   Auth.formatCredits(wei)        // Format credits (wei → ETH)
   ```

2. **assets/js/api.js** - API client
   - Auto-inject session token in all requests
   - Handle 401 errors → redirect to login
   - Support cookies + Bearer token

### TODO: Update Existing Pages

**Need to add to all dashboard pages:**
```html
<script src="assets/js/config.js"></script>
<script src="assets/js/auth.js"></script>
<script>
  // Require authentication
  Auth.requireAuth().then(isAuth => {
    if (isAuth) {
      // Load page content
      loadDashboard();
    }
  });

  // Add logout button
  function logout() {
    Auth.logout();
  }
</script>
```

---

## 🔧 Environment Variables

### Backend (.env)

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sorted_fund
DB_USER=postgres
DB_PASSWORD=

# Blockchain
SONIC_RPC_URL=https://rpc.testnet.soniclabs.com
SONIC_CHAIN_ID=14601
BACKEND_SIGNER_PRIVATE_KEY=0x...
PAYMASTER_ADDRESS=0x41B35AAD2e3F8c36ad883c354AEa828a2100Bb4a

# Production (Railway)
NODE_ENV=production
DATABASE_URL=${POSTGRES_DATABASE_URL}
ALLOWED_ORIGINS=https://sorted-fund.vercel.app,https://sorted.fund

# Future: Pimlico
PIMLICO_API_KEY=pim_...
BUNDLER_TYPE=pimlico  # or 'alto' for local
```

### Frontend (config.js)

```javascript
const CONFIG = {
  API_BASE_URL: window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://sorted-backend.railway.app',

  // Remove hardcoded API keys (now use session tokens)
  // Old: API_KEY: 'sk_sorted_xxx'
  // New: Tokens auto-injected by api.js
};
```

---

## 🚢 Production Deployment

### Phase 5: Railway (Backend + PostgreSQL)

1. **Create Railway Project**
   - Connect GitHub repo
   - Add PostgreSQL service

2. **Configure Environment**
   ```
   NODE_ENV=production
   DATABASE_URL=${POSTGRES_DATABASE_URL}
   SONIC_RPC_URL=https://rpc.testnet.soniclabs.com
   PIMLICO_API_KEY=pim_xxx
   BACKEND_SIGNER_PRIVATE_KEY=xxx
   JWT_SECRET=xxx
   ALLOWED_ORIGINS=https://sorted-fund.vercel.app
   ```

3. **Deploy & Migrate**
   ```bash
   # Railway auto-deploys from GitHub
   # Then run migration:
   railway run npm run migrate
   ```

### Phase 5: Vercel (Frontend)

1. **Create Vercel Project**
   - Connect GitHub repo
   - Root directory: `frontend/dashboard-v2`
   - Framework: Other (static site)

2. **No Environment Variables Needed**
   - config.js auto-detects environment
   - Production API URL: https://sorted-backend.railway.app

3. **Deploy**
   - Vercel auto-deploys on git push

---

## ✅ Testing Checklist

### Local Testing (Before Deploy)

- [ ] Backend starts without errors
- [ ] Migrations run successfully
- [ ] Login with demo account works
- [ ] Session persists across page reloads
- [ ] Logout clears session
- [ ] Register new account works
- [ ] API client auto-injects tokens
- [ ] 401 redirects to login
- [ ] Credit deduction works (authorize)
- [ ] Credit refund works (reconcile)
- [ ] E2E test passes with credits

### Production Testing (After Deploy)

- [ ] Backend health check: `curl https://sorted-backend.railway.app/health`
- [ ] Frontend loads: `https://sorted-fund.vercel.app`
- [ ] Login works (no CORS errors)
- [ ] Session cookies work
- [ ] Send gasless transaction end-to-end
- [ ] Credits deducted correctly
- [ ] Credits refunded after reconciliation

---

## 📁 File Structure

```
backend/
├── src/
│   ├── db/
│   │   ├── migrations/
│   │   │   ├── 001_add_developers.sql
│   │   │   └── 005_add_developer_to_sponsorship.sql
│   │   └── database.ts
│   ├── services/
│   │   ├── authService.ts          ← NEW
│   │   ├── creditService.ts        ← NEW
│   │   ├── authorizationService.ts ← UPDATED (uses credits)
│   │   └── gasReconciliationService.ts ← UPDATED (refunds credits)
│   ├── middleware/
│   │   ├── auth.ts                 ← UPDATED (adds developerId)
│   │   └── developerAuth.ts        ← NEW
│   ├── routes/
│   │   ├── auth.ts                 ← NEW
│   │   └── sponsor.ts              ← UPDATED
│   ├── scripts/
│   │   ├── migrate.ts              ← NEW
│   │   └── hash-password.ts        ← NEW
│   └── index.ts                    ← UPDATED (mounts auth routes)
└── package.json                    ← UPDATED (bcrypt, cookie-parser)

frontend/dashboard-v2/
├── login.html                       ← NEW
├── assets/js/
│   ├── auth.js                      ← NEW
│   ├── api.js                       ← UPDATED
│   └── config.js
└── (other dashboard pages need auth checks)
```

---

## 🔮 Next Steps

### Immediate (Phase 3 Complete)
1. Update index.html to show credit balance
2. Add logout button to all pages
3. Add auth protection to all dashboard pages

### Phase 4: Pimlico
- Sign up at https://dashboard.pimlico.io
- Add `PIMLICO_API_KEY` to .env
- Test E2E with Pimlico bundler

### Phase 5: Deploy
- Railway for backend
- Vercel for frontend
- Run production testing checklist

### Phase 6: Polish
- Landing page with CTA
- Developer quickstart docs
- API reference

### Phase 7: Launch
- Announce on Sonic Discord
- Add to Sonic ecosystem page
- Monitor first users

---

## 🐛 Troubleshooting

### "Insufficient credits" error
```sql
-- Check developer balance
SELECT email, credit_balance FROM developers WHERE email = 'demo@sorted.fund';

-- Add credits (1 ETH)
UPDATE developers SET credit_balance = '1000000000000000000' WHERE email = 'demo@sorted.fund';
```

### "Invalid session" error
```javascript
// Clear browser storage
localStorage.removeItem('session_token');
localStorage.removeItem('developer');

// Login again
```

### CORS errors in production
```javascript
// Backend index.ts - verify CORS origins
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
}));

// Frontend config.js - verify API URL
API_BASE_URL: 'https://sorted-backend.railway.app'
```

---

## 📞 Support

- **Documentation**: /docs
- **Issues**: https://github.com/your-repo/sorted-fund/issues
- **Discord**: Sonic Labs Discord #sorted-fund

---

**Built with ⛽ by Sorted.fund**
*Making Web3 gasless, one transaction at a time.*
