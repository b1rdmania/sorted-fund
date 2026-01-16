# 🚀 Deploy Sorted.fund to Production - Step by Step

**Time Required:** ~30 minutes
**Cost:** Free (Railway & Vercel free tiers)

---

## 📋 Pre-Deployment Checklist

✅ Backend code ready (auth, credits, gas reconciliation)
✅ Frontend dashboard ready (login, credit display)
✅ Database migrations created
✅ Environment configs prepared
✅ Railway & Vercel configs created

---

## 🎯 Deployment Steps

### Part 1: Commit Everything to Git (5 min)

```bash
cd /Users/andy/Cursor\ Projects\ 2026/Sorted

# Check git status
git status

# Add all changes
git add .

# Commit
git commit -m "Add multi-tenant auth system with credit balance

- Database: developers, sessions, credit_transactions
- Backend: auth API, credit service, gas reconciliation
- Frontend: login page, dashboard with credits
- Deployment: Railway & Vercel configs ready"

# Push to GitHub
git push origin master
```

---

### Part 2: Deploy Backend to Railway (10 min)

#### 2.1: Sign Up & Create Project

1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `Sorted/backend` repository
6. Railway will auto-detect Node.js

#### 2.2: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. PostgreSQL instance will be created
4. Note: `DATABASE_URL` is auto-generated

#### 2.3: Configure Environment Variables

Click on your backend service → "Variables" tab

**Add these variables:**

```bash
# Node
NODE_ENV=production

# Database (auto-filled by Railway)
DATABASE_URL=${POSTGRES_DATABASE_URL}

# Blockchain
SONIC_RPC_URL=https://rpc.testnet.soniclabs.com
SONIC_CHAIN_ID=14601

# Paymaster (use existing keys)
BACKEND_SIGNER_PRIVATE_KEY=<your_private_key>
PAYMASTER_ADDRESS=0x41B35AAD2e3F8c36ad883c354AEa828a2100Bb4a

# CORS (update after Vercel deployment)
ALLOWED_ORIGINS=https://sorted-fund.vercel.app,https://*.vercel.app

# Optional: Pimlico (can add later)
# PIMLICO_API_KEY=pim_xxx
# BUNDLER_TYPE=pimlico
```

**Where to find BACKEND_SIGNER_PRIVATE_KEY:**
```bash
# If you don't have one, generate new:
cd backend
node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
# Copy the output (0x...)
```

#### 2.4: Deploy

1. Railway will auto-deploy after you set variables
2. Wait for build to complete (~2-3 min)
3. You'll get a URL like: `https://sorted-backend-production.up.railway.app`

#### 2.5: Run Database Migration

**Option A: Railway CLI**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migration
railway run npm run migrate
```

**Option B: One-time Script**
1. In Railway dashboard, go to your backend service
2. Click "Settings" → "Deploy Triggers"
3. Add a deploy hook
4. Or manually SSH and run: `npm run migrate`

**Option C: Direct SQL (Quick)**
1. Click on PostgreSQL database in Railway
2. Click "Data" tab
3. Copy/paste contents of `backend/src/db/migrations/001_add_developers.sql`
4. Execute
5. Repeat for `005_add_developer_to_sponsorship.sql`

#### 2.6: Verify Backend

```bash
# Test health endpoint
curl https://sorted-backend-production.up.railway.app/health

# Should return:
# {"status":"ok","timestamp":"...","service":"sorted-backend","version":"0.1.0"}

# Test login
curl -X POST https://sorted-backend-production.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@sorted.fund","password":"demo123"}'

# Should return session token and developer data
```

---

### Part 3: Deploy Frontend to Vercel (5 min)

#### 3.1: Update Frontend Config

**Update `frontend/dashboard-v2/assets/js/config.js`:**

Replace this line:
```javascript
? 'https://sorted-backend-production.up.railway.app'  // Update this after Railway deployment
```

With your actual Railway URL:
```javascript
? 'https://your-actual-railway-url.up.railway.app'
```

**Commit change:**
```bash
git add frontend/dashboard-v2/assets/js/config.js
git commit -m "Update production backend URL"
git push
```

#### 3.2: Sign Up & Deploy

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your GitHub repository
5. **Important:** Set root directory to `frontend/dashboard-v2`
6. Framework Preset: "Other" (static site)
7. No build command needed (already static HTML)
8. Click "Deploy"

#### 3.3: Get Your URL

Vercel will give you a URL like:
- `https://sorted-fund.vercel.app` (production)
- `https://sorted-fund-xyz.vercel.app` (preview)

#### 3.4: Update Backend CORS

Go back to Railway → Backend service → Variables

Update `ALLOWED_ORIGINS`:
```
ALLOWED_ORIGINS=https://sorted-fund.vercel.app,https://*.vercel.app,http://localhost:8081
```

Railway will auto-redeploy.

---

### Part 4: Test Production Deployment (10 min)

#### 4.1: Test Frontend

1. Visit your Vercel URL: `https://sorted-fund.vercel.app`
2. Should redirect to `/login.html`

#### 4.2: Test Login

1. Enter credentials:
   - Email: `demo@sorted.fund`
   - Password: `demo123`
2. Click "Login"
3. Should redirect to `/dashboard.html`
4. Should show:
   - ✅ Developer name: "Demo Developer"
   - ✅ Credit balance: "1.0000 ETH"
   - ✅ Logout button works

#### 4.3: Test E2E (Optional)

If you want to test gasless transactions in production:

```bash
# Update SDK to use production backend
cd sdk
# Edit test file to use production URL
npx ts-node test-e2e-alto.ts
```

---

## 🐛 Troubleshooting

### Backend won't start on Railway

**Check logs:**
1. Railway dashboard → Backend service → "Deployments"
2. Click latest deployment → "View Logs"

**Common issues:**
- Missing environment variables
- Database connection failed (check DATABASE_URL)
- Port binding (Railway auto-assigns PORT)

**Fix:** Ensure `src/index.ts` uses `process.env.PORT`:
```typescript
const PORT = process.env.PORT || 3000;
```

### Frontend CORS errors

**Symptoms:** Login fails with "CORS policy" error in console

**Fix:**
1. Check Railway backend logs for CORS errors
2. Verify `ALLOWED_ORIGINS` includes your Vercel URL
3. Ensure Vercel URL matches exactly (https, no trailing slash)

### "Session expired" on login

**Cause:** Backend cookies not working in production

**Fix:** Ensure backend `index.ts` has:
```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true, // Important!
}));
```

### Database migration failed

**Option 1:** Run migration manually in Railway SQL editor

**Option 2:** Use Railway CLI:
```bash
railway link
railway run npm run migrate
```

**Option 3:** Create migrations table manually, then run migrations

---

## ✅ Post-Deployment Checklist

- [ ] Backend health check works: `curl https://your-railway-url.up.railway.app/health`
- [ ] Frontend loads: `https://your-vercel-url.vercel.app`
- [ ] Login works (demo@sorted.fund / demo123)
- [ ] Dashboard shows credit balance
- [ ] Logout works
- [ ] No CORS errors in browser console
- [ ] Backend logs show successful requests

---

## 🎉 You're Live!

**Your production URLs:**
- Frontend: `https://sorted-fund.vercel.app`
- Backend: `https://sorted-backend-production.up.railway.app`

**Next steps:**
1. Share the URL with testers
2. Monitor Railway logs for errors
3. Add custom domain (optional)
4. Set up Pimlico for production bundler
5. Add more credits to demo account for testing

---

## 💰 Costs

**Railway:**
- Free tier: $5 credits/month
- Estimated usage: ~$5-10/month (hobby project)
- PostgreSQL included in free tier

**Vercel:**
- Free tier: Unlimited static sites
- No cost for this project

**Total:** ~$0-10/month

---

## 🔐 Security Notes

**Before going fully public:**
1. Change demo account password
2. Add rate limiting to auth endpoints
3. Enable Railway's health checks
4. Set up monitoring/alerts
5. Review CORS origins (remove wildcards)

---

## 📞 Need Help?

**Railway:** https://railway.app/help
**Vercel:** https://vercel.com/docs
**Issues:** Check backend logs first, then frontend console

---

**Ready to deploy? Follow the steps above!** 🚀
