# Phase 3 Implementation Plan - Make Everything Actually Work

## Current State
- Dashboard fully functional: balance, keys, allowlist, transactions all load real data
- Live Demo: simulated only
- Add Funds: placeholder only
- No HD wallet deposit addresses yet

## Goal
Make live demo execute real gasless transactions and enable real funding via deposit addresses.

---

## Stage 1: Wire Up Live Demo to Real Backend (2 hours)

### 1.1 - Update live-demo.html to call real APIs
**File:** `frontend/dashboard-v2/live-demo.html`

**Changes:**
- Replace simulated flow with real API calls
- Fetch actual counter value from blockchain via backend
- Call `/sponsor/authorize` endpoint with real UserOperation
- Submit to Pimlico bundler
- Poll for transaction confirmation
- Display real tx hash with explorer link

**Test:**
- Click "Execute Gasless Transaction"
- Verify it calls backend `/sponsor/authorize`
- Verify UserOperation sent to Pimlico
- Verify transaction appears on Sonic explorer
- Verify counter increments on-chain

### 1.2 - Add blockchain reader helper to backend
**File:** `backend/src/services/blockchainService.ts` (NEW)

**Purpose:**
- Read current counter value from TestCounter contract
- Read user account balance
- Reusable for other contract reads

**Functions:**
```typescript
async getCounterValue(contractAddress: string): Promise<number>
async getAccountBalance(address: string): Promise<string>
```

**Test:**
- curl backend endpoint to get counter value
- Verify it returns current on-chain state

### 1.3 - Update demo to use real test account
**Config:** Use existing `TEST_ACCOUNT_ADDRESS` from config

**Changes:**
- Load real account balance (should be 0)
- Load real counter value before execution
- Fetch updated counter value after execution
- Show before/after comparison with real data

**Test:**
- Verify BEFORE shows real on-chain counter value
- Execute transaction
- Verify AFTER shows updated counter value
- Verify account balance stayed at 0

---

## Stage 2: HD Wallet Deposit Addresses - Backend (3 hours)

### 2.1 - Install HD wallet dependencies
**File:** `backend/package.json`

```bash
npm install ethers
```

**Note:** ethers.js already installed, just ensure HD wallet support

### 2.2 - Create deposit service
**File:** `backend/src/services/depositService.ts` (NEW)

**Features:**
- Generate HD wallet addresses from master seed
- Path: `m/44'/60'/0'/0/{projectIndex}`
- Store deposit_address in projects table
- Function to get wallet for signing forwarding txs

**Functions:**
```typescript
generateDepositAddress(projectIndex: number): { address: string, index: number }
getDepositWallet(projectIndex: number): Wallet
forwardToPaymaster(fromIndex: number, amount: bigint): Promise<string>
```

**Test:**
- Call generateDepositAddress(0, 1, 2)
- Verify deterministic addresses
- Verify can recreate wallet from index

### 2.3 - Database migration
**File:** `backend/src/db/migrations/003_add_deposit_addresses.sql` (NEW)

```sql
ALTER TABLE projects
ADD COLUMN deposit_address VARCHAR(42),
ADD COLUMN derivation_index INTEGER;

CREATE INDEX idx_projects_deposit_address ON projects(deposit_address);
```

**Execute:**
```bash
psql -U sorted -d sorted_dev -f backend/src/db/migrations/003_add_deposit_addresses.sql
```

**Test:**
- Verify columns added
- Verify index created

### 2.4 - Update project creation to generate deposit address
**File:** `backend/src/services/projectService.ts`

**Changes:**
- When creating project, call `depositService.generateDepositAddress()`
- Store `deposit_address` and `derivation_index` in DB
- Return deposit_address in API responses

**Test:**
- Create new project via API
- Verify deposit_address in response
- Verify stored in database

### 2.5 - Backfill existing projects with deposit addresses
**Script:** `backend/src/scripts/backfillDepositAddresses.ts` (NEW)

**Purpose:**
- Generate addresses for existing projects (test-game, etc)
- Assign derivation_index sequentially

**Test:**
- Run script
- Verify test-game project has deposit_address
- Verify address is deterministic (same seed = same address)

---

## Stage 3: Update Add Funds Page (1 hour)

### 3.1 - Load real deposit address
**File:** `frontend/dashboard-v2/add-funds.html`

**Changes:**
- Fetch project info from `/projects/:id`
- Display real `deposit_address` from backend
- Remove MetaMask button entirely
- Keep QR code button (can implement later)
- Show clear instructions: "Send S tokens to this address on Sonic testnet"

**Test:**
- Open add-funds page
- Verify displays real deposit address
- Verify address matches backend DB

### 3.2 - Test manual deposit
**Manual Test:**
- Copy deposit address from UI
- Send 0.1 S from external wallet to deposit address
- View transaction on Sonic explorer
- Verify funds arrive at deposit address

**Note:** Auto-detection/forwarding not implemented yet - that's Phase 4

---

## Stage 4: Create Manual Refuel Endpoint (1 hour)

### 4.1 - Add manual refuel endpoint
**File:** `backend/src/routes/projects.ts`

**New Endpoint:**
```typescript
POST /projects/:id/refuel
Body: { amount: string, txHash: string, note: string }
```

**Purpose:**
- Admin can manually record deposits
- Useful for testing before Alchemy webhooks
- Creates entry in `gas_tank_refuels` table

**Test:**
- Send S to deposit address
- Call POST /projects/test-game/refuel with amount + txHash
- Verify gas_tank_balance increases
- Verify entry in gas_tank_refuels table

### 4.2 - Add refuel history to dashboard
**File:** `frontend/dashboard-v2/add-funds.html`

**Changes:**
- Load refuel history from `/projects/:id/refuels`
- Display table of past deposits
- Show: date, amount, tx hash, status

**Test:**
- After manual refuel
- Reload add-funds page
- Verify deposit appears in history

---

## Stage 5: Integration Testing (1 hour)

### 5.1 - End-to-end flow test
**Steps:**
1. Open gas-station page → verify balance displays
2. Go to add-funds → copy deposit address
3. Send 1.0 S to deposit address from external wallet
4. Wait for confirmation on Sonic explorer
5. Call manual refuel endpoint with tx details
6. Reload gas-station → verify balance increased to 6.2450 S
7. Go to live-demo page
8. Execute gasless transaction
9. Verify counter increments
10. Verify balance decreases slightly (gas used)
11. Go to transactions page → verify new transaction appears

### 5.2 - Test allowlist blocking
**Steps:**
1. Remove TestCounter from allowlist
2. Try executing live demo
3. Verify sponsorship REJECTED
4. Re-add TestCounter to allowlist
5. Execute demo again
6. Verify sponsorship APPROVED

### 5.3 - Test API key generation and use
**Steps:**
1. Generate new API key via dashboard
2. Copy API key
3. Use API key to call `/sponsor/authorize` via curl
4. Verify request authorized
5. Disable API key
6. Try same request
7. Verify request REJECTED

---

## Stage 6: Polish & Documentation (1 hour)

### 6.1 - Update README with setup instructions
**File:** `README.md`

**Add sections:**
- How to generate master seed for HD wallets
- How to fund gas tank manually
- How to test live demo
- Environment variables needed

### 6.2 - Add helper scripts
**Files:**
- `scripts/generate-master-seed.js` - Generate new HD wallet seed
- `scripts/fund-gas-tank.sh` - Send S to deposit address
- `scripts/manual-refuel.sh` - Call refuel endpoint

### 6.3 - Update frontend info banners
**Changes:**
- Add note on add-funds page: "Deposits are not auto-detected yet. Contact admin to credit your account."
- Add note on live-demo page: "Requires sufficient gas tank balance"

---

## Total Time Estimate: ~8-10 hours

## What We'll Have After This:
✅ Live demo executes REAL gasless transactions on-chain
✅ Real HD wallet deposit addresses per project
✅ Manual deposit/refuel workflow working
✅ Complete end-to-end flow functional
✅ Ready for real usage (with manual refuel step)

## What's Still Missing (Future Phase 4):
- Alchemy webhook integration (auto-detect deposits)
- Automatic forwarding to paymaster
- Cron poller backup for missed deposits
- Real-time balance updates via websockets

---

## Implementation Order:

1. Stage 1 (Live Demo) - Most visible, best demo
2. Stage 2 (HD Wallets) - Foundation for funding
3. Stage 3 (Add Funds UI) - User-facing
4. Stage 4 (Manual Refuel) - Make it work end-to-end
5. Stage 5 (Testing) - Verify everything works
6. Stage 6 (Polish) - Production-ready

Ready to start with Stage 1?
