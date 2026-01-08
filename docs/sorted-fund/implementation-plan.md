# Sorted.fund Implementation Plan

## Overview

This document provides a step-by-step implementation guide for building Sorted.fund. Each phase includes specific deliverables, testing checkpoints, and success criteria. We move to the next phase only after the current phase is validated and working.

---

## Phase 1: Foundation & Environment Setup

**Goal**: Establish project structure, tooling, and development environment.

### 1.1 Project Initialization
- [ ] Create monorepo structure (contracts, backend, sdk, demo)
- [ ] Initialize Git repository with `.gitignore`
- [ ] Set up TypeScript/Node.js backend (Express or Fastify)
- [ ] Initialize Hardhat or Foundry for smart contracts
- [ ] Create basic `package.json` with dependencies
- [ ] Set up environment variables template (`.env.example`)

**Testing Checkpoint**: Run `npm install` and verify all dependencies resolve. Run basic "hello world" endpoints and contract compilation.

### 1.2 Development Environment
- [ ] Configure Sonic testnet RPC endpoints
- [ ] Document EntryPoint v0.7 address: `0x0000000071727de22e5e9d8baf0edac6f37da032`
- [ ] Set up Pimlico API key (via their CLI/dashboard)
- [ ] Create test wallet with Sonic testnet tokens
- [ ] Configure Hardhat/Foundry to deploy to Sonic testnet

**Testing Checkpoint**: Successfully ping Sonic RPC, query EntryPoint contract, confirm Pimlico API key works with basic RPC call.

**Success Criteria**: Clean build, all tools installed, testnet connectivity confirmed.

---

## Phase 2: Smart Contract - Verifying Paymaster

**Goal**: Deploy a working paymaster contract that validates sponsorships on Sonic testnet.

### 2.1 Paymaster Contract Skeleton
- [ ] Create `SortedPaymaster.sol` inheriting from ERC-4337 v0.7 base paymaster
- [ ] Hard-code EntryPoint v0.7 address
- [ ] Implement basic `validatePaymasterUserOp` function
- [ ] Add owner/admin role for configuration
- [ ] Add emergency pause mechanism

**Testing Checkpoint**: Contract compiles without errors, deploy to local Hardhat network, verify admin functions work.

### 2.2 Signature Verification
- [ ] Implement `paymasterAndData` parsing logic:
  - Paymaster address (20 bytes)
  - Expiry timestamp (4 bytes)
  - Max cost (32 bytes)
  - Policy hash (32 bytes)
  - ECDSA signature (65 bytes)
- [ ] Add backend signer address configuration
- [ ] Implement ECDSA signature recovery and verification
- [ ] Validate expiry timestamp against `block.timestamp`

**Testing Checkpoint**: Write unit tests with ethers.js that generate signed payloads, verify paymaster correctly validates/rejects based on signature and expiry.

### 2.3 Policy Enforcement
- [ ] Add allowlist storage (target contract → selector → enabled mapping)
- [ ] Implement allowlist checking in `validatePaymasterUserOp`
- [ ] Add gas limit validation (max `callGasLimit`, `verificationGasLimit`, etc.)
- [ ] Implement max cost per operation check
- [ ] Add policy hash validation

**Testing Checkpoint**: Unit tests covering allowlist hits/misses, gas limit enforcement, cost caps.

### 2.4 Kill Switches
- [ ] Add global kill switch (pause all sponsorships)
- [ ] Add per-project kill switch (store project IDs and their status)
- [ ] Add per-chain kill switch (though single-chain for MVP)
- [ ] Implement admin functions to toggle switches

**Testing Checkpoint**: Unit tests showing kill switches block sponsorships, admin can toggle on/off.

### 2.5 Deployment to Sonic Testnet
- [ ] Deploy `SortedPaymaster.sol` to Sonic testnet
- [ ] Verify contract on block explorer
- [ ] Configure initial backend signer address
- [ ] Fund paymaster with testnet ETH for gas sponsorship
- [ ] Add initial allowlist entries for testing

**Testing Checkpoint**: Contract deployed, verified, funded. Manual test: call EntryPoint with a signed UserOp and confirm paymaster sponsors it.

**Success Criteria**: Paymaster contract deployed on Sonic testnet, validates signatures, enforces allowlists, respects kill switches. All unit tests passing.

---

## Phase 3: Backend Control Plane

**Goal**: Build the API that manages projects, API keys, gas tanks, and signs sponsorship authorizations.

### 3.1 Database Schema
- [ ] Set up PostgreSQL (or preferred DB)
- [ ] Create `projects` table (id, owner, status, gasTankBalance, dailyCap, createdAt)
- [ ] Create `apiKeys` table (key, projectId, issuedAt, revokedAt, rateLimit)
- [ ] Create `allowlists` table (projectId, targetContract, selector, enabled)
- [ ] Create `sponsorshipEvents` table (id, projectId, userOpHash, estimatedGas, actualGas, status, timestamp)
- [ ] Create `gasTankRefuels` table (projectId, amount, timestamp)
- [ ] Run migrations

**Testing Checkpoint**: Database created, tables exist, can insert/query test data manually.

### 3.2 Backend API Skeleton
- [ ] Create Express/Fastify server with TypeScript
- [ ] Set up request logging middleware
- [ ] Add health check endpoint (`GET /health`)
- [ ] Configure CORS and security headers
- [ ] Add environment variable loading (DB connection, signer key, etc.)

**Testing Checkpoint**: Server starts, health check returns 200, logs appear in console.

### 3.3 Project & API Key Management
- [ ] Implement `POST /projects` - create new project
- [ ] Implement `GET /projects/:id` - fetch project details
- [ ] Implement `POST /projects/:id/apikeys` - generate API key
- [ ] Implement API key authentication middleware
- [ ] Store API keys securely (hashed with salt)
- [ ] Add project status checks (active, suspended, killed)

**Testing Checkpoint**: Use curl/Postman to create a project, generate API key, authenticate requests with it.

### 3.4 Gas Tank Management
- [ ] Implement `POST /projects/:id/refuel` - add funds to gas tank
- [ ] Implement `GET /projects/:id/balance` - check gas tank balance
- [ ] Add reserved amount tracking (funds reserved for pending ops)
- [ ] Implement balance deduction on sponsorship
- [ ] Add low-balance alerts/warnings

**Testing Checkpoint**: Refuel a project, check balance, reserve funds, verify balance updates correctly.

### 3.5 Allowlist Configuration
- [ ] Implement `POST /projects/:id/allowlist` - add target/selector to allowlist
- [ ] Implement `GET /projects/:id/allowlist` - view allowlist
- [ ] Implement `DELETE /projects/:id/allowlist` - remove from allowlist
- [ ] Validate Ethereum addresses and function selectors
- [ ] Sync allowlist state with policy hash computation

**Testing Checkpoint**: CRUD operations on allowlist work, data persists correctly.

### 3.6 `/sponsor/authorize` Endpoint
- [ ] Implement `POST /sponsor/authorize` with schema validation:
  - `projectId`, `chainId`, `user`, `target`, `selector`, `estimatedGas`, `clientNonce`
- [ ] Check API key authentication
- [ ] Verify project status (not killed, not suspended)
- [ ] Verify target/selector is allowlisted
- [ ] Check gas tank has sufficient balance
- [ ] Reserve max cost from gas tank
- [ ] Generate `paymasterAndData` payload:
  - Encode paymaster address, expiry, max cost, policy hash
  - Sign with backend ECDSA key
  - Return signed payload + metadata

**Testing Checkpoint**: Send valid authorization request, receive signed `paymasterAndData`. Send invalid requests (unauthorized selector, insufficient balance), verify proper error codes.

### 3.7 Rate Limiting & Caps
- [ ] Implement per-API-key rate limiting (e.g., 100 req/min)
- [ ] Implement daily cap tracking per project
- [ ] Add usage counters (requests today, gas spent today)
- [ ] Reset daily counters at midnight UTC
- [ ] Return rate limit headers in responses

**Testing Checkpoint**: Exceed rate limit and verify 429 response. Test daily cap enforcement.

### 3.8 Kill Switch Endpoints
- [ ] Implement `POST /admin/killswitch/global` - toggle global kill switch
- [ ] Implement `POST /admin/killswitch/project/:id` - toggle project kill switch
- [ ] Add admin authentication for kill switch endpoints
- [ ] Ensure `/sponsor/authorize` respects kill switches (return 503)

**Testing Checkpoint**: Toggle kill switches, verify authorization requests are blocked appropriately.

**Success Criteria**: Backend API running, can create projects, generate API keys, manage allowlists, sign authorizations, enforce rate limits and kill switches. All endpoints tested with curl/Postman.

---

## Phase 4: SDK Development

**Goal**: Build a developer-friendly SDK that wraps backend API + Pimlico bundler interaction.

### 4.1 SDK Skeleton
- [ ] Create TypeScript SDK package (`@sorted/sdk`)
- [ ] Initialize with `SortedClient` class
- [ ] Configure with API key, backend URL, Pimlico API key
- [ ] Add error handling and retry logic
- [ ] Export types for TypeScript consumers

**Testing Checkpoint**: Import SDK in test project, instantiate client with config.

### 4.2 Authorization Flow
- [ ] Implement `client.authorize(params)` method
- [ ] Call backend `/sponsor/authorize` with API key
- [ ] Handle success (return `paymasterAndData`) and errors
- [ ] Parse and validate response schema
- [ ] Add TypeScript types for authorization request/response

**Testing Checkpoint**: Call `authorize()` with valid project, receive signed payload. Test error handling with invalid inputs.

### 4.3 Pimlico Bundler Integration
- [ ] Implement Pimlico JSON-RPC client
- [ ] Add `eth_sendUserOperation` call
- [ ] Add `eth_estimateUserOperationGas` call (optional)
- [ ] Add `pimlico_getUserOperationStatus` polling
- [ ] Handle bundler responses and errors

**Testing Checkpoint**: Mock Pimlico responses, verify SDK correctly handles success/failure cases.

### 4.4 Sponsored Transaction Helper
- [ ] Implement high-level `sendSponsoredTx()` method:
  - Takes target, selector, callData, user account
  - Calls `authorize()` to get `paymasterAndData`
  - Constructs full UserOperation
  - Submits to Pimlico via `eth_sendUserOperation`
  - Polls for status
  - Returns transaction receipt or error
- [ ] Add clear error messages for common failure modes
- [ ] Add logging/debug mode

**Testing Checkpoint**: End-to-end test with mock backend and bundler, verify UserOperation is constructed correctly.

### 4.5 SDK Documentation
- [ ] Write README with quickstart example
- [ ] Document all public methods and types
- [ ] Add code examples for common flows
- [ ] Document error codes and meanings

**Success Criteria**: SDK can authorize sponsorships and submit to bundler. Well-typed, good error handling, documented.

---

## Phase 5: End-to-End Integration

**Goal**: Connect all components (paymaster, backend, SDK, Pimlico) and run live sponsored transactions on Sonic testnet.

### 5.1 Integration Test Setup
- [ ] Create test project in backend
- [ ] Fund gas tank with sufficient balance
- [ ] Generate API key for test project
- [ ] Deploy a simple test target contract to Sonic testnet (e.g., counter increment)
- [ ] Add test contract + selector to allowlist

**Testing Checkpoint**: Test project configured, gas tank funded, allowlist set.

### 5.2 Live Sponsored Transaction
- [ ] Create test script using SDK
- [ ] Call `sendSponsoredTx()` with test contract
- [ ] Verify authorization call to backend succeeds
- [ ] Verify UserOperation submitted to Pimlico
- [ ] Poll for UserOperation status
- [ ] Confirm transaction included on Sonic testnet
- [ ] Verify paymaster sponsored the gas
- [ ] Check backend logs show sponsorship event

**Testing Checkpoint**: Transaction confirmed on Sonic testnet block explorer, gas paid by paymaster, backend shows event logged.

### 5.3 Error Path Testing
- [ ] Test unauthorized selector (should reject at backend)
- [ ] Test insufficient gas tank balance (should reject at backend)
- [ ] Test expired `paymasterAndData` (should reject at paymaster)
- [ ] Test invalid signature (should reject at paymaster)
- [ ] Test kill switch activated (should reject at backend)
- [ ] Verify SDK surfaces clear error messages for each case

**Testing Checkpoint**: All error scenarios handled gracefully, clear error messages returned.

### 5.4 Gas Reconciliation
- [ ] After successful transaction, query actual gas used from receipt
- [ ] Compare actual gas vs estimated gas from authorization
- [ ] Log discrepancy in backend
- [ ] Update gas tank balance with actual cost
- [ ] Release reserved amount if over-reserved

**Testing Checkpoint**: Backend accurately tracks actual gas usage, balances update correctly.

**Success Criteria**: Fully functional end-to-end flow. Sponsored transactions work on Sonic testnet. Error handling robust. Logging complete.

---

## Phase 6: Demo Application

**Goal**: Build a simple demo app that integrates Sorted.fund to prove the developer experience.

### 6.1 Demo App Setup
- [ ] Create simple web app (React/Next.js or vanilla HTML/JS)
- [ ] Add "Connect Wallet" button (MetaMask or similar)
- [ ] Deploy a demo contract (e.g., guestbook, simple game)
- [ ] Configure demo app with Sorted SDK

**Testing Checkpoint**: App loads, wallet connects, UI renders.

### 6.2 Gasless Transaction Flow
- [ ] Add button to trigger sponsored transaction
- [ ] Call `sdk.sendSponsoredTx()` on button click
- [ ] Show loading state while transaction pending
- [ ] Display success message with transaction hash link
- [ ] Handle errors and show user-friendly messages

**Testing Checkpoint**: User clicks button, transaction succeeds without wallet gas prompt, receipt displayed.

### 6.3 Demo Polish
- [ ] Add gas tank balance display
- [ ] Show recent sponsored transactions
- [ ] Add clear setup instructions (fund gas tank, get API key)
- [ ] Time the setup process (target <15 minutes)

**Testing Checkpoint**: New developer can follow instructions and get gasless transactions working in <15 minutes.

**Success Criteria**: Working demo app showcasing gasless UX. Developer onboarding validated.

---

## Phase 7: Observability & Operations

**Goal**: Add monitoring, alerts, and operational tooling for production readiness.

### 7.1 Logging & Metrics
- [ ] Add structured logging (JSON format)
- [ ] Log every authorization request with correlation ID
- [ ] Log every UserOperation submission and result
- [ ] Track metrics: authorization rate, success rate, average gas cost
- [ ] Add timestamp and duration to all events

**Testing Checkpoint**: Generate test traffic, verify logs are complete and queryable.

### 7.2 Alerts & Monitoring
- [ ] Set up health check monitoring (uptime tracking)
- [ ] Add alert for low gas tank balances
- [ ] Add alert for high error rates
- [ ] Add alert for gas estimate vs actual discrepancies >20%
- [ ] Add alert for kill switch activation

**Testing Checkpoint**: Trigger each alert condition, verify notifications fire.

### 7.3 Analytics Dashboard (Optional)
- [ ] Build simple dashboard showing:
  - Total sponsored transactions
  - Gas tank balances by project
  - Error rate trends
  - Top projects by usage
- [ ] Add date range filtering

**Testing Checkpoint**: Dashboard displays accurate data, updates in real-time or near-real-time.

**Success Criteria**: Complete observability, alerts configured, ready for production monitoring.

---

## Phase 8: Documentation & Handoff

**Goal**: Finalize documentation for developers and operators.

### 8.1 Developer Documentation
- [ ] API reference for `/sponsor/authorize` and all backend endpoints
- [ ] SDK reference with all methods and types
- [ ] Integration guide (step-by-step)
- [ ] Error code reference
- [ ] Troubleshooting guide

### 8.2 Operator Documentation
- [ ] Deployment guide (backend, contracts, database)
- [ ] Configuration reference (environment variables)
- [ ] Kill switch playbook
- [ ] Gas tank refill procedures
- [ ] Monitoring and alerting setup

### 8.3 Architecture Documentation
- [ ] Update architecture.md with actual implementation details
- [ ] Add sequence diagrams for key flows
- [ ] Document security considerations
- [ ] Add runbook for common operational scenarios

**Success Criteria**: Complete documentation, ready for external developers and DevRel teams.

---

## Testing Strategy Summary

At each phase:
1. **Unit tests**: Test individual components in isolation
2. **Integration tests**: Test component interactions
3. **End-to-end tests**: Test full flows on testnet
4. **Manual validation**: Human review of key behaviors
5. **Success criteria check**: Verify phase goals met before proceeding

---

## Next Steps

1. Review this plan and adjust based on priorities or constraints
2. Set up development environment (Phase 1)
3. Begin Phase 2 (paymaster contract) or Phase 3 (backend), depending on preference
4. Work through phases sequentially, validating at each checkpoint

**Estimated Timeline**: 4-6 weeks for Phases 1-6, assuming one engineer full-time. Phases 7-8 can run in parallel or post-launch.

---

## Open Questions to Resolve

- [ ] Preferred backend framework? (Express, Fastify, NestJS)
- [ ] Preferred database? (PostgreSQL, MySQL, MongoDB)
- [ ] Preferred contract framework? (Hardhat, Foundry)
- [ ] Admin authentication mechanism? (API keys, OAuth, manual)
- [ ] Monitoring/alerting infrastructure? (Datadog, Sentry, custom)
- [ ] Do we have Pimlico API key already, or need to create?
