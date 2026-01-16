# 🚂 Railway Deployment - Quick Fix Guide

## Problem You Hit

```
⚠ Script start.sh not found
✖ Railpack could not determine how to build the app.
```

**Cause:** Railway was looking in the wrong directory (repo root instead of `backend` folder)

---

## ✅ Solution: Set Root Directory

### Option 1: Railway Dashboard (Easiest - 2 minutes)

1. **Go to your Railway project**
2. **Click on your backend service**
3. **Settings tab**
4. **Find "Root Directory"** (under Service Settings)
5. **Change from:** (empty)
6. **Change to:** `backend`
7. **Click "Deploy"**

Railway will automatically redeploy with the correct directory.

---

### Option 2: Use Railway CLI (Terminal)

```bash
# Login to Railway
railway login

# Navigate to backend
cd /Users/andy/Cursor\ Projects\ 2026/Sorted/backend

# Link to your existing project
railway link

# Deploy
railway up

# Add PostgreSQL (if not added yet)
railway add

# Run migration
railway run npm run migrate
```

---

## 🔧 What Railway Needs

Railway looks for these files in the **root directory**:

✅ `package.json` - Node.js project
✅ `nixpacks.toml` - Build configuration
✅ `Procfile` - Start command
✅ `railway.json` - Deployment settings

**All these files are in the `backend` folder**, so Railway needs:
```
Root Directory = backend
```

---

## 📝 Correct Railway Settings

After setting Root Directory to `backend`, Railway will:

**Build:**
```bash
npm ci              # Install dependencies
npm run build       # Compile TypeScript → dist/
```

**Start:**
```bash
node dist/index.js  # Run compiled code
```

**Environment it needs:**
- `DATABASE_URL` (auto-provided by Railway PostgreSQL)
- `SONIC_RPC_URL=https://rpc.testnet.soniclabs.com`
- `SONIC_CHAIN_ID=14601`
- `BACKEND_SIGNER_PRIVATE_KEY=<your_key>`
- `PAYMASTER_ADDRESS=0x41B35AAD2e3F8c36ad883c354AEa828a2100Bb4a`
- `ALLOWED_ORIGINS=<will_set_after_vercel>`

---

## 🚀 Quick Deploy Commands

If you want to use CLI:

```bash
# 1. Login (opens browser)
railway login

# 2. Navigate to backend
cd backend

# 3. Initialize new project OR link existing
railway init
# OR
railway link  # if project already exists

# 4. Add PostgreSQL
railway add

# 5. Deploy
railway up

# 6. Set environment variables (in dashboard or CLI)
railway variables set SONIC_RPC_URL=https://rpc.testnet.soniclabs.com
railway variables set SONIC_CHAIN_ID=14601
# ... etc

# 7. Run migration
railway run npm run migrate

# 8. Check logs
railway logs

# 9. Open dashboard
railway open
```

---

## ✅ Verify Deployment

Once deployed, test:

```bash
# Get your Railway URL from dashboard, then:
curl https://your-railway-url.railway.app/health

# Should return:
# {"status":"ok","timestamp":"...","service":"sorted-backend","version":"0.1.0"}
```

---

## 🎯 After Backend is Live

1. **Copy your Railway URL** (e.g., `https://sorted-backend-production.up.railway.app`)

2. **Update frontend config:**
   ```bash
   # Edit: frontend/dashboard-v2/assets/js/config.js
   # Replace the production URL with your Railway URL
   ```

3. **Commit and push:**
   ```bash
   git add frontend/dashboard-v2/assets/js/config.js
   git commit -m "Update production backend URL"
   git push
   ```

4. **Deploy frontend to Vercel** (it will auto-pull the update)

5. **Update backend CORS** with your Vercel URL

---

## 🐛 If Build Still Fails

**Check Railway build logs for:**

1. **"Cannot find module"** → Missing dependency in package.json
2. **"TypeScript errors"** → Fix TS errors, commit, push
3. **"Port already in use"** → Railway auto-assigns PORT (code should use `process.env.PORT`)

**Verify index.ts uses Railway's PORT:**
```typescript
const PORT = process.env.PORT || 3000;  // ✅ Correct
// NOT: const PORT = 3000;  // ❌ Wrong
```

---

## 📞 Need Help?

**Railway Logs:**
```bash
railway logs
```

**Railway Status:**
```bash
railway status
```

**Railway Dashboard:**
```bash
railway open
```

**Or just set Root Directory = `backend` in the dashboard and it should work!**

---

**TL;DR:** Go to Railway Dashboard → Your Service → Settings → Root Directory = `backend` → Deploy
