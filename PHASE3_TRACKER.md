# Phase 3 Implementation Tracker

**Goal:** Make live demo and funding actually work (no MetaMask, just send to address)

**Total Estimated Time:** 8-10 hours

---

## Stage 1: Wire Up Live Demo to Real Backend (2 hours)

### Task 1.1: Add blockchain reader service
- [ ] Create `backend/src/services/blockchainService.ts`
- [ ] Implement `getCounterValue(contractAddress)`
- [ ] Implement `getAccountBalance(address)`
- [ ] Test with curl to verify reads actual on-chain state

### Task 1.2: Update live-demo.html to call real APIs
- [ ] Add script includes (config, utils, api)
- [ ] Replace simulated `executeTransaction()` with real implementation
- [ ] Fetch real counter value before execution
- [ ] Call `/sponsor/authorize` with actual UserOperation
- [ ] Poll for transaction confirmation
- [ ] Fetch updated counter value after execution
- [ ] Display real tx hash with Sonic explorer link

### Task 1.3: Test live demo end-to-end
- [ ] Open live-demo.html in browser
- [ ] Verify BEFORE state shows real on-chain counter value
- [ ] Click "Execute Gasless Transaction"
- [ ] Verify backend called, bundler submission successful
- [ ] Wait for confirmation
- [ ] Verify AFTER state shows incremented counter
- [ ] Verify account balance still 0
- [ ] Verify tx link opens on Sonic explorer

**Stage 1 Complete:** ⬜

---

## Stage 2: HD Wallet Deposit Addresses - Backend (3 hours)

### Task 2.1: Create deposit service
- [ ] Create `backend/src/services/depositService.ts`
- [ ] Implement `generateDepositAddress(projectIndex)`
- [ ] Implement `getDepositWallet(projectIndex)`
- [ ] Implement `forwardToPaymaster(fromIndex, amount)` (for future use)
- [ ] Test deterministic address generation

### Task 2.2: Database migration
- [ ] Create `backend/src/db/migrations/003_add_deposit_addresses.sql`
- [ ] Add `deposit_address VARCHAR(42)` column to projects
- [ ] Add `derivation_index INTEGER` column to projects
- [ ] Create index on deposit_address
- [ ] Run migration on database
- [ ] Verify columns exist

### Task 2.3: Update project service
- [ ] Modify `projectService.createProject()` to generate deposit address
- [ ] Store deposit_address and derivation_index in DB
- [ ] Update `getProject()` to return deposit_address
- [ ] Test creating new project returns deposit address

### Task 2.4: Backfill existing projects
- [ ] Create `backend/src/scripts/backfillDepositAddresses.ts`
- [ ] Assign derivation_index 0, 1, 2... to existing projects
- [ ] Generate and save deposit addresses
- [ ] Run script
- [ ] Verify test-game has deposit_address

### Task 2.5: Add environment variable for master seed
- [ ] Add MASTER_MNEMONIC to backend/.env
- [ ] Generate secure 12-word seed phrase
- [ ] Document in README (with warning to keep secret)
- [ ] Test deposit service can use seed

**Stage 2 Complete:** ⬜

---

## Stage 3: Update Add Funds Page (1 hour)

### Task 3.1: Wire up add-funds.html
- [ ] Load project info from `/projects/:id`
- [ ] Display real deposit_address from backend
- [ ] Remove MetaMask button and section entirely
- [ ] Update instructions: "Send S tokens to this address on Sonic testnet"
- [ ] Keep "Copy Address" button functional
- [ ] Add note: "Deposits are not auto-detected yet. Contact admin to credit your account."

### Task 3.2: Test manual deposit
- [ ] Open add-funds page in browser
- [ ] Verify displays correct deposit address
- [ ] Copy address
- [ ] Send 0.1 S from external wallet to address
- [ ] Verify transaction on Sonic explorer
- [ ] Verify funds arrive at deposit address

**Stage 3 Complete:** ⬜

---

## Stage 4: Manual Refuel Endpoint (1 hour)

### Task 4.1: Create refuel endpoint
- [ ] Add POST `/projects/:id/refuel` to `backend/src/routes/projects.ts`
- [ ] Accept: `{ amount: string, txHash: string, note: string }`
- [ ] Update `gas_tank_balance` in projects table
- [ ] Create entry in `gas_tank_refuels` table
- [ ] Return updated project balance

### Task 4.2: Create refuels table if needed
- [ ] Check if `gas_tank_refuels` table exists
- [ ] Create migration if needed
- [ ] Run migration

### Task 4.3: Add refuel history endpoint
- [ ] Add GET `/projects/:id/refuels`
- [ ] Return list of refuel transactions
- [ ] Order by created_at DESC

### Task 4.4: Update add-funds page with history
- [ ] Fetch refuel history from `/projects/:id/refuels`
- [ ] Display table: Date, Amount, TX Hash, Status
- [ ] Link TX hash to Sonic explorer

### Task 4.5: Test manual refuel flow
- [ ] Send S to deposit address from wallet
- [ ] Get tx hash from explorer
- [ ] curl POST /projects/test-game/refuel with amount + txHash
- [ ] Verify gas_tank_balance increased
- [ ] Reload add-funds page
- [ ] Verify deposit appears in history
- [ ] Reload gas-station page
- [ ] Verify balance updated in header

**Stage 4 Complete:** ⬜

---

## Stage 5: Integration Testing (1 hour)

### Task 5.1: Full end-to-end flow test
- [ ] Open gas-station → verify current balance
- [ ] Go to add-funds → copy deposit address
- [ ] Send 1.0 S from external wallet
- [ ] Confirm on Sonic explorer
- [ ] curl manual refuel endpoint
- [ ] Reload gas-station → verify balance +1.0 S
- [ ] Go to live-demo
- [ ] Execute gasless transaction
- [ ] Verify counter increments on-chain
- [ ] Verify balance decreases (gas used)
- [ ] Go to transactions → verify new tx appears

### Task 5.2: Test allowlist blocking
- [ ] Go to allowlist page
- [ ] Delete TestCounter entry
- [ ] Go to live-demo
- [ ] Try executing transaction
- [ ] Verify backend REJECTS (not in allowlist)
- [ ] Re-add TestCounter to allowlist
- [ ] Execute transaction again
- [ ] Verify APPROVED

### Task 5.3: Test API key auth
- [ ] Go to access-keys page
- [ ] Generate new API key
- [ ] Copy key
- [ ] curl /sponsor/authorize with new key
- [ ] Verify request succeeds
- [ ] Use invalid key
- [ ] Verify request REJECTED with 401

**Stage 5 Complete:** ⬜

---

## Stage 6: Polish & Documentation (1 hour)

### Task 6.1: Update README
- [ ] Add HD wallet setup section
- [ ] Document MASTER_MNEMONIC env var
- [ ] Add manual funding workflow docs
- [ ] Add testing instructions
- [ ] Add screenshots/examples

### Task 6.2: Create helper scripts
- [ ] `scripts/generate-seed.js` - Generate new HD wallet seed
- [ ] `scripts/manual-refuel.sh` - Helper to call refuel endpoint
- [ ] Make scripts executable

### Task 6.3: Update UI info messages
- [ ] Add note on add-funds: "Deposits require manual confirmation"
- [ ] Add note on live-demo: "Requires gas tank balance > 0"
- [ ] Update empty states with helpful instructions

### Task 6.4: Final cleanup
- [ ] Remove any console.logs
- [ ] Remove any placeholder comments
- [ ] Test all pages load without errors
- [ ] Verify all links work

**Stage 6 Complete:** ⬜

---

## Final Deliverables Checklist

- [ ] Live demo executes real gasless transactions on Sonic testnet
- [ ] HD wallet deposit addresses generated for each project
- [ ] Add funds page displays correct deposit address
- [ ] Manual refuel endpoint working
- [ ] Deposit history displayed on add-funds page
- [ ] All dashboard pages functional with real data
- [ ] README updated with setup instructions
- [ ] Helper scripts created
- [ ] All integration tests passing

---

## Notes & Issues

*(Add notes here as we work through stages)*

---

**Current Stage:** Not Started
**Last Updated:** 2026-01-08
