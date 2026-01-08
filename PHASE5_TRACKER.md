# Phase 5 Implementation Tracker

**Goal:** End-to-End Integration - Run live sponsored transactions on Sonic testnet with complete system integration

**Total Estimated Time:** 4-6 hours

---

## Current System Status

### Already Complete from Phase 3 ✅
- **Test project**: test-game created
- **Gas tank**: Funded with 7.468 S
- **API key**: Generated and tested
- **Smart contracts deployed**:
  - SimpleAccount: `0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506`
  - TestCounter: `0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3`
  - SortedPaymaster: `0x41B35AAD2e3F8c36ad883c354AEa828a2100Bb4a`
- **Allowlist**: TestCounter.increment() configured
- **Backend**: Running with authorization working

### Needs Implementation ⬜
- **Alto Bundler**: Install and configure (Pimlico doesn't support Sonic testnet)
- **Live bundler submission**: Actually submit to Alto and execute on-chain
- **Error path testing**: Test all failure scenarios

### Implemented ✅
- **Gas reconciliation**: Track actual gas vs estimated (backend + SDK)

---

## Stage 1: Bundler Setup & Configuration (30 minutes)

### Discovery: Pimlico Doesn't Support Sonic Testnet ⚠️
- [x] Checked Pimlico documentation for Sonic support
- [x] Confirmed chain ID 14601 NOT supported by Pimlico hosted service
- [x] Researched alternative: Alto (Pimlico's open-source bundler)
- [x] Created comprehensive Alto setup guide at `docs/sorted-fund/alto-bundler-setup.md`
- [x] Cloned Alto repository to `bundler/alto/`

### Task 1.1: Install and Build Alto
- [ ] Run `pnpm install` in bundler/alto/
- [ ] Run `pnpm run build:contracts`
- [ ] Run `pnpm run build`

### Task 1.2: Configure Alto for Sonic Testnet
- [ ] Create `config.sonic-testnet.json` in bundler/alto/
- [ ] Generate 2 executor wallets for bundler
- [ ] Fund executor wallets with ~0.5 S each from faucet
- [ ] Generate utility wallet and fund with ~0.1 S
- [ ] Add private keys to config file

### Task 1.3: Run Alto Bundler
- [ ] Start Alto: `pnpm start --config config.sonic-testnet.json`
- [ ] Verify bundler starts on port 4337
- [ ] Test connection: `curl -X POST http://localhost:4337 -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'`
- [ ] Verify EntryPoint: `eth_supportedEntryPoints` returns v0.7 address

**Stage 1 Complete:** ⬜ (Documentation complete, installation pending)

---

## Stage 2: First Live Sponsored Transaction (1 hour)

### Task 2.1: Pre-flight checks
- [ ] Verify backend is running (http://localhost:3000)
- [ ] Verify PostgreSQL is running
- [ ] Verify gas tank balance sufficient (>0.1 S)
- [ ] Verify allowlist has TestCounter entry
- [ ] Check current counter value on-chain

### Task 2.2: Run SDK integration test
- [ ] Execute: `npx ts-node sdk/examples/node/test-integration.ts`
- [ ] Monitor backend logs for authorization request
- [ ] Watch for Alto bundler submission
- [ ] Monitor Alto logs for UserOperation processing
- [ ] Poll for UserOperation status
- [ ] Wait for on-chain confirmation

### Task 2.3: Verify on-chain results
- [ ] Check transaction on Sonic explorer
- [ ] Verify counter incremented correctly
- [ ] Verify gas paid by paymaster (not user)
- [ ] Check backend sponsorship_events table
- [ ] Verify gas tank balance decreased

### Task 2.4: Analyze transaction
- [ ] Review actual gas used vs estimated
- [ ] Check paymaster validation gas
- [ ] Review UserOperation receipt details
- [ ] Document any issues or optimizations needed

**Stage 2 Complete:** ⬜

---

## Stage 3: Error Path Testing (1.5 hours)

### Task 3.1: Test unauthorized selector
- [ ] Remove TestCounter from allowlist
- [ ] Try to execute increment()
- [ ] Verify backend rejects with "not allowlisted" error
- [ ] Confirm no UserOp submitted to bundler
- [ ] Re-add to allowlist

### Task 3.2: Test insufficient gas tank balance
- [ ] Note current gas tank balance
- [ ] Manually set balance to very low (e.g., 1000 wei)
- [ ] Try to execute transaction
- [ ] Verify backend rejects with "insufficient balance"
- [ ] Restore original balance

### Task 3.3: Test expired paymasterAndData
- [ ] Modify authorization to return already-expired timestamp
- [ ] Build and sign UserOperation
- [ ] Submit to Alto bundler
- [ ] Verify paymaster contract rejects during validation
- [ ] Confirm error message is clear

### Task 3.4: Test invalid signature
- [ ] Build UserOperation with valid paymasterAndData
- [ ] Use wrong signer to sign UserOp
- [ ] Submit to Alto bundler
- [ ] Verify paymaster or account rejects signature
- [ ] Check error message clarity

### Task 3.5: Test project kill switch
- [ ] Suspend test-game project (status = 'suspended')
- [ ] Try to authorize transaction
- [ ] Verify backend rejects immediately
- [ ] Confirm appropriate error returned
- [ ] Reactivate project (status = 'active')

### Task 3.6: Test rate limiting (if implemented)
- [ ] Send many rapid authorization requests
- [ ] Verify rate limit kicks in
- [ ] Check for 429 response
- [ ] Wait for rate limit window to reset

**Stage 3 Complete:** ⬜

---

## Stage 4: Gas Reconciliation & Analytics (1 hour)

### Task 4.1: Implement gas reconciliation ✅
- [x] Created `gasReconciliationService.ts` in backend
- [x] Added `POST /sponsor/reconcile` endpoint
- [x] Added `GET /sponsor/stats/:projectId` endpoint
- [x] Integrated automatic reconciliation in SDK `waitForUserOp()`
- [x] After transaction, fetch actual gas from receipt
- [x] Compare with estimated gas from authorization
- [x] Log discrepancy in backend (>20% difference)
- [x] Update sponsorship_events with actual_gas
- [x] Calculate accuracy percentage

### Task 4.2: Test multiple transactions
- [ ] Execute 5-10 transactions with varying complexity
- [ ] Record estimated vs actual gas for each
- [ ] Calculate average estimation accuracy
- [ ] Identify patterns in over/under estimation
- [ ] Adjust estimation algorithm if needed

### Task 4.3: Verify gas tank accounting
- [ ] Record initial gas tank balance
- [ ] Execute several transactions
- [ ] Sum actual gas costs from all transactions
- [ ] Verify gas tank balance decreased by correct amount
- [ ] Check no reserved funds are stuck

### Task 4.4: Test analytics endpoints
- [ ] Query /analytics/overview
- [ ] Verify totalSponsored count is accurate
- [ ] Check totalGasUsed matches sum of actual gas
- [ ] Verify activeUsers count
- [ ] Test timeline endpoint with various periods

**Stage 4 Complete:** ⬜ (Task 4.1 complete, tasks 4.2-4.4 require Alto bundler running)

---

## Stage 5: Performance & Polish (1 hour)

### Task 5.1: Transaction speed benchmarking
- [ ] Measure authorization request latency
- [ ] Measure bundler submission time
- [ ] Measure total time from request to confirmation
- [ ] Identify bottlenecks
- [ ] Document typical transaction times

### Task 5.2: Stress testing
- [ ] Submit 10 transactions rapidly
- [ ] Verify all complete successfully
- [ ] Check for any rate limiting issues
- [ ] Monitor backend performance
- [ ] Check database query performance

### Task 5.3: Error recovery testing
- [ ] Test network failures (disconnect during transaction)
- [ ] Test backend restart during pending transaction
- [ ] Verify transactions still complete
- [ ] Check for any stuck states
- [ ] Test transaction retry logic

### Task 5.4: Documentation updates
- [ ] Document typical transaction flow timing
- [ ] Add troubleshooting guide for common errors
- [ ] Document Pimlico API key setup
- [ ] Add production readiness checklist
- [ ] Update README with Phase 5 results

**Stage 5 Complete:** ⬜

---

## Final Deliverables Checklist

- [ ] Live sponsored transactions working on Sonic testnet
- [ ] All error paths tested and handled gracefully
- [ ] Gas reconciliation accurate and automated
- [ ] Analytics tracking actual gas usage
- [ ] Performance benchmarks documented
- [ ] Comprehensive error handling tested
- [ ] Documentation updated with findings
- [ ] System ready for production deployment

---

## Prerequisites

### Environment Variables Needed:
```bash
# Backend
DATABASE_URL=postgresql://postgres:sortedtest@localhost:5432/sorted_fund
MASTER_MNEMONIC="liquid bus below unveil..."
PAYMASTER_ADDRESS=0x41B35AAD2e3F8c36ad883c354AEa828a2100Bb4a
PAYMASTER_PRIVATE_KEY=0x...
SONIC_RPC_URL=https://rpc.testnet.soniclabs.com

# SDK Test
SORTED_API_KEY=sk_sorted_c2b9e0ece64c3e988dcad47b170dd19b5041ac1dc7e5ddd1ed33aa9e2f988271
ACCOUNT_OWNER_KEY=0x... (private key of SimpleAccount owner)

# Alto Bundler (in config.sonic-testnet.json)
# - executor-private-keys: Comma-separated private keys (need to generate)
# - utility-private-key: Private key for utility operations (need to generate)
```

### Services Required:
- ✅ PostgreSQL running
- ✅ Backend API running (http://localhost:3000)
- ✅ Sonic testnet RPC accessible
- ⬜ Alto bundler built and configured
- ⬜ Alto bundler running (http://localhost:4337)

---

## Notes & Issues

### Phase 5 Progress Log:

**2026-01-08:**
- ✅ Researched Pimlico support for Sonic testnet
- ❌ Confirmed Pimlico does NOT support Sonic testnet (Chain ID 14601)
- ✅ Identified Alto (Pimlico's open-source bundler) as alternative
- ✅ Created comprehensive Alto setup guide at `docs/sorted-fund/alto-bundler-setup.md`
- ✅ Cloned Alto repository to `bundler/alto/`
- ✅ Implemented gas reconciliation service in backend
- ✅ Added `/sponsor/reconcile` and `/sponsor/stats/:projectId` endpoints
- ✅ Integrated automatic gas reconciliation in SDK
- ✅ Fixed TypeScript error in `depositService.ts` (HDNodeWallet type)
- ✅ Backend builds successfully
- ✅ SDK builds successfully

**Known Considerations:**
- ✅ RESOLVED: Pimlico doesn't support Sonic testnet - using Alto instead
- SimpleAccount owner private key needs to be test wallet (not production)
- Gas estimation may need tuning based on actual results
- Alto bundler requires executor wallets funded with ~0.5 S each
- Alto bundler needs to be built with pnpm before use

**Next Steps:**
1. Install and build Alto bundler (Stage 1)
2. Configure Alto for Sonic testnet with executor wallets
3. Run first live sponsored transaction (Stage 2)
4. Test gas reconciliation with real transactions (Stage 4.2-4.4)

---

**Current Stage:** Stage 1 (Documentation complete, installation pending) & Stage 4.1 (Complete)
**Last Updated:** 2026-01-08
