# 🚀 Render.com Deployment - Fully Automated

**Time Required:** 5 minutes
**CLI Required:** NO - Everything via dashboard
**Config File:** render.yaml (already created ✅)

---

## ✅ What's Ready

I've created `render.yaml` which tells Render exactly how to deploy everything:

- ✅ Backend API (Node.js)
- ✅ PostgreSQL database
- ✅ All environment variables
- ✅ Health checks
- ✅ Auto-deploys on git push

**Everything is configured!** Just need to connect GitHub.

---

## 🚀 Deploy Steps (5 Minutes)

### Step 1: Go to Render

**Open:** https://render.com

**Sign up/in with GitHub**

### Step 2: Create New Blueprint

1. Click **"New +"** button (top right)
2. Select **"Blueprint"**
3. Click **"Connect account"** under GitHub
4. Authorize Render to access your repos
5. Search for: **"sorted-fund"**
6. Click **"Connect"**

### Step 3: Render Auto-Detects Configuration

Render will find `render.yaml` and show:

**Services it will create:**
- ✅ `sorted-backend` (Web Service)
- ✅ `sorted-postgres` (PostgreSQL Database)

**Click "Apply"**

### Step 4: Set Private Key (One-Time)

After clicking Apply:

1. Go to **"sorted-backend"** service
2. Click **"Environment"** tab
3. Find **`BACKEND_SIGNER_PRIVATE_KEY`**
4. **Replace generated value** with your actual private key
   ```
   0x<your_private_key_here>
   ```
5. Click **"Save Changes"**

**If you need to generate a new key:**
```bash
node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
```

### Step 5: Wait for Deployment

**Render will automatically:**
- ✅ Create PostgreSQL database
- ✅ Install dependencies (`npm install`)
- ✅ Build TypeScript (`npm run build`)
- ✅ Start server (`npm start`)
- ✅ Run health checks

**Takes ~3-5 minutes**

**Watch the logs** - you'll see:
```
==> Building...
==> Installing dependencies...
==> Building TypeScript...
==> Starting server...
==> Deploy live at https://sorted-backend.onrender.com
```

### Step 6: Run Database Migration

Once deployed:

**Option A: Render Shell (Easiest)**
1. Go to **"sorted-backend"** service
2. Click **"Shell"** tab (top right)
3. Run:
   ```bash
   npm run migrate
   ```

**Option B: One-Time Job**
1. Click **"New +"** → **"Job"**
2. Use existing service: **sorted-backend**
3. Command: `npm run migrate`
4. Click **"Start Job"**

### Step 7: Get Your URLs

**Backend URL:**
- Render dashboard → sorted-backend → copy URL
- Example: `https://sorted-backend.onrender.com`

**Database URL:**
- Render dashboard → sorted-postgres → Internal Database URL
- Already auto-connected to backend via `DATABASE_URL`

---

## 🎯 After Backend is Live

### Update Frontend Config

```bash
# Edit this file:
nano frontend/dashboard-v2/assets/js/config.js

# Change line 11 to your Render URL:
? 'https://sorted-backend.onrender.com'

# Commit and push
git add frontend/dashboard-v2/assets/js/config.js
git commit -m "Update production backend URL to Render"
git push
```

### Deploy Frontend to Vercel

1. Go to https://vercel.com
2. **New Project** → Import `sorted-fund`
3. **Root Directory:** `frontend/dashboard-v2`
4. **Deploy**

### Update Backend CORS

1. Render dashboard → sorted-backend → Environment
2. Update `ALLOWED_ORIGINS`:
   ```
   https://sorted-fund.vercel.app,https://*.vercel.app,http://localhost:8081
   ```
3. **Save Changes** (auto-redeploys)

---

## ✅ Testing Production

### Test Backend Health

```bash
curl https://sorted-backend.onrender.com/health

# Should return:
# {"status":"ok","timestamp":"...","service":"sorted-backend","version":"0.1.0"}
```

### Test Login API

```bash
curl -X POST https://sorted-backend.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@sorted.fund","password":"demo123"}'

# Should return session token and developer data
```

### Test Frontend

1. Visit: `https://sorted-fund.vercel.app`
2. Should redirect to login
3. Login: `demo@sorted.fund` / `demo123`
4. Should show dashboard with credit balance

---

## 🆓 Free Tier Limits

**Render Free Tier:**
- ✅ 750 hours/month (enough for 1 service 24/7)
- ✅ Free PostgreSQL (90 days, then upgrade or backup)
- ✅ Auto-sleep after 15min inactivity
- ✅ Auto-wake on request

**Vercel Free Tier:**
- ✅ Unlimited static deployments
- ✅ 100GB bandwidth/month
- ✅ Always-on (no sleep)

**Total Cost:** $0/month for testing!

---

## 🔧 Render.yaml Explained

```yaml
services:
  - type: web              # Web service (API)
    name: sorted-backend   # Service name
    runtime: node          # Node.js
    rootDir: backend       # Use backend/ subdirectory ✅
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /health  # Auto health monitoring

databases:
  - name: sorted-postgres  # PostgreSQL
    plan: free            # Free tier
    databaseName: sorted_fund
```

**Key Feature:** `rootDir: backend` - This solves the subdirectory problem!

---

## 🎯 Advantages Over Railway

✅ **Simpler:** Just connect GitHub, done
✅ **Free PostgreSQL:** Included, auto-connected
✅ **Health checks:** Built-in monitoring
✅ **Shell access:** Run migrations easily
✅ **Better logs:** Clearer build/deploy logs
✅ **render.yaml:** Infrastructure as code

---

## 🐛 Troubleshooting

### "Build failed"
- Check logs in Render dashboard
- Usually TypeScript errors or missing dependencies

### "Application failed to respond"
- Check `startCommand` is correct
- Verify `PORT` env var is used: `process.env.PORT || 3000`

### "Database connection failed"
- Ensure migration ran: `npm run migrate`
- Check DATABASE_URL is set (auto-set by Render)

### "CORS errors"
- Update `ALLOWED_ORIGINS` with Vercel URL
- Save changes (triggers redeploy)

---

## 📞 Support

**Render Docs:** https://render.com/docs
**Render Status:** https://status.render.com
**Render Community:** https://community.render.com

---

**TL;DR:**
1. Go to render.com
2. New Blueprint → Connect GitHub → sorted-fund
3. Apply
4. Set BACKEND_SIGNER_PRIVATE_KEY
5. Wait 5 minutes
6. Run migration in Shell
7. Done! ✅
