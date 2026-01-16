# 🧪 Dashboard Testing Guide

**Status:** New dashboard created with auth + credits!
**Test This:** Login flow and credit display

---

## ✅ What's Been Added

**New Dashboard (`dashboard.html`):**
- ✅ Shows developer name and email
- ✅ Displays credit balance (ETH + USD estimate)
- ✅ Logout button
- ✅ Protected with auth (redirects to login if not logged in)
- ✅ Quick action cards for all features
- ✅ Account stats placeholder

**Updated Pages:**
- ✅ `index.html` - Auto-redirects based on auth status
- ✅ `login.html` - Redirects to new dashboard after login

---

## 🧪 Test the New Dashboard

### Step 1: Start Frontend Server

```bash
cd /Users/andy/Cursor\ Projects\ 2026/Sorted/frontend/dashboard-v2
python3 -m http.server 8081
```

### Step 2: Open Browser

```bash
open http://localhost:8081
```

**Expected behavior:**
- Should redirect to `login.html` (if not logged in)
- OR redirect to `dashboard.html` (if already logged in)

### Step 3: Test Login Flow

1. **Enter credentials:**
   - Email: `demo@sorted.fund`
   - Password: `demo123`

2. **Click "Login"**

3. **Verify redirect to dashboard**

**Should see:**
- ✅ Developer name: "Demo Developer"
- ✅ Email: "demo@sorted.fund"
- ✅ Credit balance: "1.0000 ETH"
- ✅ USD estimate: "≈ $2000.00"
- ✅ Logout button (top right)
- ✅ Quick action cards for:
  - ⛽ Gas Station
  - 🔑 API Keys
  - ✅ Allowlist
  - 📊 Transactions
  - 🎮 Live Demo

### Step 4: Test Logout

1. Click "Logout" button
2. Confirm logout
3. Should redirect to login page

### Step 5: Test Auto-Redirect

1. After logging out, try visiting `http://localhost:8081`
2. Should auto-redirect to login page

3. After logging back in, visit `http://localhost:8081` again
4. Should auto-redirect to dashboard

---

## 🐛 Troubleshooting

### "Loading dashboard..." stuck forever

**Cause:** Backend not running or session expired

**Fix:**
```bash
# Make sure backend is running
cd /Users/andy/Cursor\ Projects\ 2026/Sorted/backend
npm run dev

# If still stuck, clear localStorage and login again
# In browser console:
localStorage.clear()
location.reload()
```

### Credit balance shows "0.0000 ETH"

**Cause:** Demo developer credit balance is 0

**Fix:**
```bash
# Add credits to demo account
cd /Users/andy/Cursor\ Projects\ 2026/Sorted/backend
psql -d sorted_fund -c "UPDATE developers SET credit_balance = '1000000000000000000' WHERE email = 'demo@sorted.fund';"

# Logout and login again to refresh
```

### Backend auth errors

**Check backend logs:**
```bash
# Backend should show:
POST /auth/login 200
POST /auth/me 200
```

**If 401 errors:**
- Session expired - logout and login again
- Session token invalid - clear localStorage

---

## 🎯 Next Steps

### Remaining Dashboard Pages to Update

Need to add auth protection to these pages:
1. `gas-station.html` - Add auth check + logout button
2. `access-keys.html` - Add auth check + logout button
3. `allowlist.html` - Add auth check + logout button
4. `transactions.html` - Add auth check + logout button
5. `add-funds.html` - Add auth check + logout button
6. `live-demo.html` - Can stay public OR add auth

**Pattern to add to each page:**
```html
<script src="assets/js/config.js"></script>
<script src="assets/js/auth.js"></script>
<script src="assets/js/api.js"></script>
<script>
  // Require authentication
  Auth.requireAuth();

  // Add logout button click handler
  function logout() {
    if (confirm('Are you sure you want to logout?')) {
      Auth.logout();
    }
  }
</script>
```

---

## 📊 Current Flow

```
User visits index.html
  ↓
Checks Auth.isAuthenticated()
  ↓
  ├─ If YES → Redirect to dashboard.html
  │            ↓
  │            Show credit balance, quick actions
  │            ↓
  │            User clicks action → Go to feature page
  │
  └─ If NO → Redirect to login.html
               ↓
               User logs in
               ↓
               Redirect to dashboard.html
```

---

## ✅ Testing Checklist

- [ ] Visit `http://localhost:8081` - redirects to login
- [ ] Login with demo account - success
- [ ] Redirects to dashboard - shows credit balance
- [ ] Credit balance correct: "1.0000 ETH"
- [ ] Developer name shows: "Demo Developer"
- [ ] Logout button works
- [ ] After logout, redirects to login
- [ ] After login again, redirects to dashboard
- [ ] Quick action cards are clickable
- [ ] No console errors

---

**Status:** Main dashboard complete! Test it, then we'll update the other pages.
