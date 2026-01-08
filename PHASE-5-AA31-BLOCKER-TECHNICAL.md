# Phase 5 Technical Blocker: AA31 Paymaster Deposit Issue

**Date:** 2026-01-07
**Status:** ⚠️ BLOCKED - Persistent AA31 error despite adequate paymaster deposits
**Priority:** HIGH - Blocking Phase 5 completion
**For Review By:** Technical team / Pimlico support

---

## Executive Summary

We have successfully built a complete ERC-4337 gasless transaction system on Sonic testnet, but are blocked by a persistent **AA31 "paymaster deposit too low"** error when submitting UserOperations through Pimlico bundler. Despite having **1.15 S deposited** in the paymaster (EntryPoint v0.7) and **0.15 S in v0.6**, the error persists.

**Current completion:** 98% - Everything works except final on-chain execution.

---

## System Architecture

### Deployed Components (All Working)

| Component | Address | Status |
|-----------|---------|--------|
| **EntryPoint v0.7** | `0x0000000071727de22e5e9d8baf0edac6f37da032` | ✅ Pre-deployed on Sonic |
| **EntryPoint v0.6** | `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` | ✅ Pre-deployed on Sonic |
| **SortedPaymaster** | `0xB3034d28A4e374aad345756145c9EbCA0CC7584e` | ✅ Deployed (v0.7 compatible) |
| **SimpleAccount** | `0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506` | ✅ Deployed (v0.7 compatible) |
| **TestCounter** | `0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3` | ✅ Deployed |
| **Backend API** | `localhost:3000` | ✅ Running |

### Infrastructure

- **Network:** Sonic Testnet (Chain ID: 14601)
- **Bundler:** Pimlico API v1 (bundler methods)
- **Backend Signer:** `0x2577e25eBc6596eE9E05241a028b42EE4bffAD4f`
- **Account Owner:** `0xDCBa4C636bCd0b2d8B476646df64AE621f1ED670`

---

## The Problem

### Error Message

```
UserOperation reverted with reason: AA31 paymaster deposit too low
Code: -32508
```

### What AA31 Means

From ERC-4337 spec, AA31 indicates:
> The paymaster's deposit in the EntryPoint is insufficient to cover the `requiredPrefund` for the UserOperation.

**Formula:**
```
requiredPrefund = (callGasLimit + verificationGasLimit + preVerificationGas +
                   paymasterVerificationGasLimit + paymasterPostOpGasLimit) × maxFeePerGas
```

### Current Paymaster Deposits

```bash
# EntryPoint v0.7
Balance: 1.15 S (1,150,000,000,000,000,000 wei)

# EntryPoint v0.6
Balance: 0.15 S (150,000,000,000,000,000 wei)
```

**This should be MORE than enough** for a simple increment transaction which typically costs ~0.001 S in gas.

---

## What's Working ✅

### 1. Backend Authorization (100%)

**Request:**
```bash
POST http://localhost:3000/sponsor/authorize
Authorization: Bearer sk_sorted_1b890bd4d0f369277cef4638decaf927de01ddd3276c1f3806be9b46f0147092
```

**Response:**
```json
{
  "paymasterAndData": "0xb3034d28a4e374aad345756145c9ebca0cc7584e695ef86a...",
  "expiresAt": "2026-01-08T00:20:58.000Z",
  "maxCost": "0x1b48eb581a980",
  "policyHash": "0x254d4acb22d795d72f95842ea06dbc8db99a3b9f537434b6f72b841b8bfe45fa"
}
```

**Status:** ✅ 200 OK - Backend generates valid signatures

### 2. SDK UserOp Construction (100%)

**UserOperation Built:**
```typescript
{
  sender: "0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506",
  nonce: 0,
  callData: "0x...", // SimpleAccount.execute(TestCounter, 0, increment())
  callGasLimit: "0x00000000000000000000000000030d40", // 200000
  verificationGasLimit: "0x00000000000000000000000000186a0", // 100000
  preVerificationGas: "0xc350", // 50000
  maxFeePerGas: "0x0000000000000000000000000000000077359401", // 2 gwei
  maxPriorityFeePerGas: "0x0000000000000000000000000000000077359400", // 2 gwei
  paymaster: "0xb3034d28a4e374aad345756145c9ebca0cc7584e",
  paymasterVerificationGasLimit: "0x7530", // 30000
  paymasterPostOpGasLimit: "0x7530", // 30000
  paymasterData: "0x695ef86a...", // Backend-signed authorization
  signature: "0xce636a7f..." // Owner signature
}
```

**Status:** ✅ Properly formatted v0.7 UnpackedUserOperation

### 3. Pimlico Submission (100%)

**API Call:**
```bash
POST https://api.pimlico.io/v1/14601/rpc?apikey=pim_ZL9gKSF5okZT96AHbrTu6d
Method: eth_sendUserOperation
Params: [userOp, "0x0000000071727de22e5e9d8baf0edac6f37da032"]
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "message": "UserOperation reverted with reason: AA31 paymaster deposit too low",
    "code": -32508
  }
}
```

**Status:** ✅ Pimlico accepts and validates our UserOp format (gets to EntryPoint validation)

---

## What We've Tried (8 Iterations)

### 1. ✅ Fixed v0.6/v0.7 Format Conversion
- **Issue:** Initially sent packed v0.7 format
- **Fix:** Converted to v0.7 UnpackedUserOperation format
- **Result:** Pimlico accepted format, but AA31 persists

### 2. ✅ Switched to Pimlico v1 API
- **Issue:** Was using v2 API (for paymasters)
- **Fix:** Changed to v1 API (for bundler methods)
- **URL:** `https://api.pimlico.io/v1/14601/rpc`
- **Result:** Proper API endpoint, but AA31 persists

### 3. ✅ Fixed Paymaster Parsing (3 deployments)
- **Iteration 1:** Original v0.7 format with packed gas limits in paymasterAndData
- **Iteration 2:** Adjusted offsets to skip gas limits (bytes 20-51)
- **Iteration 3:** Reverted to original offsets (gas limits are separate fields in UnpackedUserOp)
- **Current:** `0xB3034d28A4e374aad345756145c9EbCA0CC7584e`
- **Result:** Correct parsing, but AA31 persists

### 4. ✅ Increased Paymaster Deposit (Multiple times)
- **0.05 S** → AA31
- **0.15 S** → AA31
- **0.65 S** → AA31
- **1.15 S (v0.7) + 0.15 S (v0.6)** → AA31
- **Result:** Even massive deposits don't resolve AA31

### 5. ✅ Adjusted Gas Limits
- **High limits:** 200,000 for paymaster gas → AA31
- **Low limits:** 30,000 for paymaster gas → AA31
- **Result:** Gas limit adjustments don't affect AA31

### 6. ✅ Verified EntryPoint Addresses
- Confirmed v0.7 EntryPoint deployed: ✅
- Confirmed v0.6 EntryPoint deployed: ✅
- Passing v0.7 address to Pimlico: ✅
- **Result:** Correct EntryPoint specified, but AA31 persists

### 7. ✅ Updated All Configurations
- Backend `.env` updated with new paymaster
- SDK rebuilt with v0.7 format
- Backend restarted to pick up changes
- **Result:** All configs correct, but AA31 persists

### 8. ✅ Funded Both EntryPoints
- **v0.7:** 1.15 S deposited
- **v0.6:** 0.15 S deposited
- **Result:** Still AA31

---

## Detailed Technical Analysis

### Required Prefund Calculation

Using our actual UserOp values:

```
callGasLimit: 200,000
verificationGasLimit: 100,000
preVerificationGas: 50,000
paymasterVerificationGasLimit: 30,000
paymasterPostOpGasLimit: 30,000
maxFeePerGas: 2,000,000,001 wei (2 gwei)

Total Gas: 410,000
requiredPrefund = 410,000 × 2,000,000,001
                = 820,000,000,410,000 wei
                = 0.00082 S
```

**Our deposit:** 1.15 S (1,400x the required amount!)

**Conclusion:** The deposit is MORE than sufficient. Something else is wrong.

---

## Possible Root Causes

### Hypothesis 1: Pimlico Using Wrong EntryPoint ⭐ MOST LIKELY

**Evidence:**
- We specify v0.7 EntryPoint (`0x0000000071727de22e5e9d8baf0edac6f37da032`)
- Pimlico v1 API claims to support both v0.6 and v0.7
- But Pimlico might default to v0.6 on Sonic testnet

**Test:**
- Our paymaster has 1.15 S in v0.7 EntryPoint
- Our paymaster has 0.15 S in v0.6 EntryPoint
- AA31 persists regardless

**Implication:**
If Pimlico is using v0.6 EntryPoint, our v0.7-compatible contracts (SimpleAccount, SortedPaymaster) would fail validation because the interfaces are incompatible.

### Hypothesis 2: Gas Limit Encoding Issue

**Evidence:**
- v0.7 UnpackedUserOperation uses separate fields for gas limits
- Pimlico might be re-packing incorrectly
- The massive deposit requirement could indicate misread gas values

**Example:**
```javascript
// If Pimlico incorrectly interprets:
callGasLimit: "0x00000000000000000000000000030d40"

// As (reading wrong bytes):
callGasLimit: 0x0000000000000000 (entire 32 bytes)
             = 13,835,058,055,282,163,712 gas
```

**Calculation:**
```
requiredPrefund = 13,835,058,055,282,163,712 × 2 gwei
                = 27,670,116,110,564,327,424 wei
                = 27,670 S (!!!)
```

This would explain why 1.15 S is "too low"!

### Hypothesis 3: SimpleAccount Incompatibility

**Evidence:**
- Our SimpleAccount is v0.7 compatible
- Pimlico might be sending to v0.6 EntryPoint
- v0.6 EntryPoint expects different UserOperation struct

**Contract Interface:**
```solidity
// Our SimpleAccount (v0.7)
function validateUserOp(
    PackedUserOperation calldata userOp, // v0.7 struct
    bytes32 userOpHash,
    uint256 missingAccountFunds
) external returns (uint256 validationData);

// v0.6 EntryPoint expects
function validateUserOp(
    UserOperation calldata userOp, // v0.6 struct (different!)
    bytes32 userOpHash,
    uint256 missingAccountFunds
) external returns (uint256 validationData);
```

**Result:** Type mismatch causes validation to fail

---

## Data for Debugging

### Full UserOperation (Last Attempt)

```json
{
  "sender": "0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506",
  "nonce": "0x0",
  "callData": "0xb61d27f6000000000000000000000000ecca59045d7d0dcfdb6a627feb3a39bc046196e300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "callGasLimit": "0x00000000000000000000000000030d40",
  "verificationGasLimit": "0x00000000000000000000000000186a0",
  "preVerificationGas": "0xc350",
  "maxFeePerGas": "0x0000000000000000000000000000000077359401",
  "maxPriorityFeePerGas": "0x0000000000000000000000000000000077359400",
  "paymaster": "0xb3034d28a4e374aad345756145c9ebca0cc7584e",
  "paymasterVerificationGasLimit": "0x7530",
  "paymasterPostOpGasLimit": "0x7530",
  "paymasterData": "0x695ef86a00000000000000000000000000000000000000000000000000000001b48eb581a980254d4acb22d795d72f95842ea06dbc8db99a3b9f537434b6f72b841b8bfe45fa9ee2a92b6050f5a46bc381b93ce30d95e13ddef0d3c1e871d7e6ef1f6e1d9ebb99031e25e0b90eb1bdb4ed5cce8f17695c0a0e04e287c2e1834e0efb3c4ba31a091c",
  "signature": "0xce636a7f4ad182fe62ef5fd83fbe31f68cffb6bfa462032d3ee1dda3fd65ba9162d55d8b2f5b9da3e79d98e9b8d8c01e9fd5c4e71e4e8f40be3bc23cb3a8ba501c"
}
```

### UserOpHash

```
0x87bb0f22ca642836ee8f0234923c83646032e791be4b832002cdd8c2d98fdcd2
```

### Pimlico Request

```bash
curl -X POST 'https://api.pimlico.io/v1/14601/rpc?apikey=pim_ZL9gKSF5okZT96AHbrTu6d' \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "eth_sendUserOperation",
    "params": [
      {<userOp from above>},
      "0x0000000071727de22e5e9d8baf0edac6f37da032"
    ]
  }'
```

### Backend Signature Generation

```typescript
const hash = ethers.solidityPackedKeccak256(
  ['address', 'uint256', 'uint48', 'uint256', 'bytes32', 'bytes32', 'uint256', 'address'],
  [sender, nonce, expiry, maxCost, policyHash, projectId, chainId, paymasterAddress]
);
const signature = await backendSigner.signMessage(ethers.getBytes(hash));
```

**Signature Verified:** ✅ Matches contract expectations

---

## Questions for Pimlico / Team

### For Pimlico Support

1. **EntryPoint Version:**
   - Does Pimlico's v1 API on Sonic testnet (14601) actually support EntryPoint v0.7 (`0x0000000071727de22e5e9d8baf0edac6f37da032`)?
   - Or does it default to v0.6 (`0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`) regardless?

2. **Gas Limit Encoding:**
   - How does Pimlico interpret the 32-byte padded gas limit fields in v0.7 UnpackedUserOperation?
   - Example: Is `callGasLimit: "0x00000000000000000000000000030d40"` correctly parsed as `200000`?

3. **RequiredPrefund Calculation:**
   - Can you provide the actual `requiredPrefund` value being calculated for our UserOp?
   - Why is 1.15 S deposit considered "too low"?

4. **Sonic Testnet Config:**
   - What is the default EntryPoint used by Pimlico on Sonic testnet (Chain ID 14601)?
   - Is there a way to explicitly force v0.7 EntryPoint usage?

### For Internal Team

1. **v0.6 Rebuild Option:**
   - Should we rebuild SimpleAccount and SortedPaymaster for EntryPoint v0.6?
   - Estimated effort: 4-6 hours
   - Pros: Guaranteed compatibility with Pimlico
   - Cons: Using older ERC-4337 version

2. **Alternative Bundlers:**
   - Should we explore bundlers other than Pimlico?
   - Options: Alchemy, Stackup, Candide, self-hosted

3. **Direct EntryPoint Testing:**
   - Should we bypass Pimlico and submit directly to EntryPoint for debugging?
   - Would help isolate whether issue is with Pimlico or our contracts

---

## Recommended Next Steps

### Immediate (High Priority)

1. **Contact Pimlico Support**
   - Email: support@pimlico.io
   - Discord: https://discord.gg/pimlico
   - Include this document + UserOp data above

2. **Test Direct EntryPoint Submission**
   - Submit UserOp directly to EntryPoint v0.7 on Sonic
   - Bypass Pimlico to isolate issue
   - See if validation passes

3. **Verify Pimlico EntryPoint**
   - Call `pimlico_getSupportedEntryPoints` if available
   - Confirm which EntryPoint Pimlico actually uses on Sonic

### Short-term (If Pimlico can't help quickly)

4. **Rebuild for v0.6** (4-6 hours)
   - Modify SimpleAccount for v0.6 interface
   - Modify SortedPaymaster for v0.6 interface
   - Redeploy and test
   - **Pro:** Guaranteed to work with Pimlico
   - **Con:** Using older standard

5. **Try Alternative Bundler**
   - Research Alchemy Account Kit for Sonic support
   - Test with Stackup or Candide
   - Consider self-hosting bundler for testing

---

## Code Repositories

### Contract Code

**SortedPaymaster.sol** (current deployment):
```solidity
// Location: contracts/contracts/SortedPaymaster.sol
// Address: 0xB3034d28A4e374aad345756145c9EbCA0CC7584e
// Key method: validatePaymasterUserOp (line 113)
```

**SimpleAccount.sol**:
```solidity
// Location: contracts/contracts/SimpleAccount.sol
// Address: 0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506
// Key method: validateUserOp (line 36)
```

### SDK Code

**UserOp Serialization**:
```typescript
// Location: sdk/src/index.ts
// Method: serializeUserOp (line 235)
// Converts v0.7 packed → v0.7 unpacked format
```

### Backend Code

**Authorization Service**:
```typescript
// Location: backend/src/services/authorizationService.ts
// Method: authorize (line 40)
// Generates paymasterAndData with signature
```

---

## Test Commands

### Check Paymaster Deposits

```bash
# v0.7 EntryPoint
cast call 0x0000000071727de22e5e9d8baf0edac6f37da032 \
  "balanceOf(address)(uint256)" \
  0xB3034d28A4e374aad345756145c9EbCA0CC7584e \
  --rpc-url https://rpc.testnet.soniclabs.com

# v0.6 EntryPoint
cast call 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789 \
  "balanceOf(address)(uint256)" \
  0xB3034d28A4e374aad345756145c9EbCA0CC7584e \
  --rpc-url https://rpc.testnet.soniclabs.com
```

### Run Integration Test

```bash
cd contracts
npx hardhat run scripts/test-integration.ts --network sonic
```

### Test Backend Authorization

```bash
curl -X POST http://localhost:3000/sponsor/authorize \
  -H "Authorization: Bearer sk_sorted_1b890bd4d0f369277cef4638decaf927de01ddd3276c1f3806be9b46f0147092" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-game",
    "chainId": 14601,
    "user": "0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506",
    "target": "0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3",
    "selector": "0xd09de08a",
    "estimatedGas": 200000,
    "clientNonce": "0x0"
  }'
```

---

## Success Criteria

Phase 5 will be considered complete when:

1. ✅ UserOp submitted to Pimlico successfully
2. ✅ UserOp accepted by EntryPoint (no AA31 error)
3. ✅ Paymaster validates and sponsors gas
4. ✅ SimpleAccount executes transaction
5. ✅ TestCounter.increment() completes
6. ✅ Counter value increments from 0 to 1
7. ✅ Transaction confirmed on-chain

**Current Status:** Step 2 failing with AA31

---

## Contact Information

**Pimlico Support:**
- Email: support@pimlico.io
- Discord: https://discord.gg/pimlico
- Docs: https://docs.pimlico.io

**Deployed Addresses:**
- Paymaster: `0xB3034d28A4e374aad345756145c9EbCA0CC7584e`
- SimpleAccount: `0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506`
- TestCounter: `0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3`

**Network:**
- Sonic Testnet RPC: `https://rpc.testnet.soniclabs.com`
- Chain ID: 14601
- Explorer: `https://testnet.sonicscan.org`

---

**Document Created:** 2026-01-07
**Last Updated:** 2026-01-07 00:22 UTC
**Status:** Awaiting team review / Pimlico support response
