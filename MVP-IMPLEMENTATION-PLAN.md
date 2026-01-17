# Sorted.fund MVP - Production Implementation Plan

## Current Situation

**Good News:** The backend is ~90% done! You already have:
- ✅ Developer login/registration
- ✅ Project creation
- ✅ API key generation
- ✅ Gasless transaction sponsorship (working on Sonic Testnet)
- ✅ Paymaster backend with ERC-4337

**The Key Question:** How should gas funding work?

Your original database schema has **two possible designs**:

### Option A: Per-Developer Credits (CURRENTLY DEPLOYED)
```
Developer Account
  ├── Credit Balance: 5 ETH (shared across all projects)
  ├── Project 1 → uses developer credits
  ├── Project 2 → uses developer credits
  └── Project 3 → uses developer credits
```

**Pros:**
- Simple for developers (one balance to manage)
- Easy to track spending across all projects
- Automatic refunds of unused gas

**Cons:**
- One project can drain all credits
- Need daily caps per project to prevent abuse

### Option B: Per-Project Gas Tanks (SIMPLER)
```
Developer Account
  ├── Project 1 → Gas Tank: 1 ETH
  ├── Project 2 → Gas Tank: 2 ETH
  └── Project 3 → Gas Tank: 0.5 ETH
```

**Pros:**
- ✅ **Isolation** - Projects can't affect each other
- ✅ **Simpler mental model** - Each project has its own "gas station"
- ✅ **Easier to explain** - "Fund this project with X ETH"
- ✅ **Less code** - No credit transaction audit trail needed

**Cons:**
- Developers manage multiple balances
- Each project needs separate funding

---

## Recommended: Option B (Per-Project Gas Tanks)

**Why?** For an MVP, simpler is better. Developers understand "this project has X ETH for gas."

---

## MVP Feature Set (What Users Will Do)

### 1. Developer Registration
```
Go to dashboard → Click "Register"
Enter: Email, Password, Name
→ Account created (no initial balance needed)
```

### 2. Create Project
```
Dashboard → "New Project"
Enter: Project Name
→ Project created with 0 ETH gas tank
```

### 3. Fund Project
```
Dashboard → Select Project → "Add Funds"
Send testnet S tokens to project's deposit address
→ Gas tank balance increases
```

### 4. Generate API Key
```
Dashboard → Select Project → "API Keys" → "Generate"
→ Copy API key (sk_sorted_xxx...)
→ Use in SDK/API calls
```

### 5. Send Gasless Transaction (Developer's App)
```javascript
// In developer's game/app
const sorted = new SortedClient({
  apiKey: 'sk_sorted_xxx...',
  chainId: 14601 // Sonic Testnet
});

// User wants to do something
const tx = await sorted.sponsorTransaction({
  user: userAddress,
  target: contractAddress,
  functionCall: 'doSomething()'
});
// → Gas paid by project's gas tank
// → User pays nothing
```

### 6. Monitor Usage
```
Dashboard → Select Project → View:
- Current gas tank balance
- Total transactions sponsored
- Gas used today
- Recent transactions
```

---

## What Needs to Change (From Current Deploy)

### Backend Changes (30 minutes)

1. **Switch from credits to gas tanks:**
   ```typescript
   // OLD (credit system):
   developer.credit_balance -= maxCost

   // NEW (per-project):
   project.gas_tank_balance -= maxCost
   ```

2. **Remove these files:**
   - `backend/src/services/creditService.ts` (not needed)
   - `backend/src/routes/auth.ts` routes can stay (login still needed)
   - `backend/src/middleware/developerAuth.ts` (keep for dashboard)

3. **Update authorization flow:**
   - Check `project.gas_tank_balance` instead of `developer.credit_balance`
   - Remove credit transaction auditing
   - Keep sponsorship_events table (that's still useful)

4. **Add deposit endpoint:**
   ```typescript
   POST /projects/:id/deposit
   // Records on-chain deposit → increases gas_tank_balance
   ```

### Database Changes (10 minutes)

**Option 1: Keep both systems (safest)**
- Keep `developers` table (for login)
- Keep `credit_balance` column (unused, but harmless)
- Use `gas_tank_balance` column in projects table
- Keep all existing data

**Option 2: Clean removal**
- Drop `credit_transactions` table
- Drop `developer_projects` table (if not using multi-user)
- Keep everything else

**Recommendation:** Option 1 - don't delete anything, just stop using credits.

### Frontend Changes (1 hour)

Use the **original dashboard** (`/frontend/dashboard/`) and add:

1. **Login page** (copy from dashboard-v2/login.html)
2. **Project list page** - shows developer's projects
3. **Project detail page:**
   - Gas tank balance (big number at top)
   - "Add Funds" button → shows deposit address
   - API keys section
   - Recent transactions
4. **API key generation** - one button click

---

## What Stays Exactly The Same

✅ **Paymaster backend** - No changes needed
✅ **Authorization flow** - Just change where balance is checked
✅ **API key authentication** - Already works
✅ **Allowlists** - Already works
✅ **Gas reconciliation** - Already works
✅ **Sonic Testnet integration** - Already works

---

## Implementation Steps (2-3 hours total)

### Phase 1: Backend Refactor (30 min)
- [ ] Modify `authorizationService.ts` to use `project.gas_tank_balance`
- [ ] Remove credit deduction calls
- [ ] Add `/projects/:id/deposit` endpoint
- [ ] Update gas refuel endpoint to work again

### Phase 2: Database Migration (10 min)
- [ ] Create migration to set gas_tank_balance = 1 ETH for test-game
- [ ] (Optional) Archive credit_transactions table

### Phase 3: Frontend Integration (1 hour)
- [ ] Add login page to original dashboard
- [ ] Update project pages to show gas_tank_balance
- [ ] Add "Fund Project" flow
- [ ] Test end-to-end

### Phase 4: Deploy & Test (30 min)
- [ ] Push to GitHub → auto-deploy Render backend
- [ ] Deploy frontend to Vercel
- [ ] Test: Register → Create Project → Fund → Generate API Key → Sponsor Transaction

---

## MVP vs Future Features

### MVP (Ship Next Week)
- ✅ Developer login
- ✅ Create projects
- ✅ Per-project gas tanks
- ✅ API key generation
- ✅ Gasless transactions on Sonic Testnet
- ✅ View balances

### Future (After Launch)
- 🔮 Multi-chain support (Base, Arbitrum, Polygon)
- 🔮 Stripe integration (buy credits with fiat)
- 🔮 Webhooks for transaction events
- 🔮 Advanced analytics
- 🔮 Team collaboration (multiple developers per project)
- 🔮 Shared developer credit pool (if they want it later)

---

## Decision Required

**Before I start refactoring, confirm:**

1. **Use per-project gas tanks?** (Recommended: YES)
2. **Keep developer login?** (YES)
3. **Remove demo account?** (or keep for testing?)
4. **Deploy original dashboard or v2?** (Recommend: original)

Once confirmed, I can have this refactored and deployed in 2-3 hours.
