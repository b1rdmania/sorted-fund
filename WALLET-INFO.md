# Test Wallet Information

## Generated Wallets for Sorted.fund Testing

I've generated two wallets and configured them in the `.env` files:

---

## 1️⃣ Deployer Wallet

**Purpose:** Deploy the SortedPaymaster contract to Sonic testnet

**Address:** `0xDCBa4C636bCd0b2d8B476646df64AE621f1ED670`

**Private Key:** `0xbb1ab1a9dadbbca09ff9042dfe912c68620f742882ed9bd925a93e628ac755df`

**Needs Funding:** ✅ YES - needs Sonic testnet tokens

**Location:** `contracts/.env` as `DEPLOYER_PRIVATE_KEY`

---

## 2️⃣ Backend Signer Wallet

**Purpose:** Sign `paymasterAndData` payloads for sponsorship authorization

**Address:** `0x2577e25eBc6596eE9E05241a028b42EE4bffAD4f`

**Private Key:** `0x640216c8915f4ae34c17481fdc16e306c289eed8040b49ef241c061abd6a6253`

**Needs Funding:** ❌ NO - only used for off-chain signing

**Location:**
- `contracts/.env` as `BACKEND_SIGNER_ADDRESS`
- `backend/.env` as `BACKEND_SIGNER_PRIVATE_KEY`

---

## 🚰 Action Required: Fund the Deployer Wallet

**Please fund this address from the Sonic testnet faucet:**

```
0xDCBa4C636bCd0b2d8B476646df64AE621f1ED670
```

### Steps:

1. **Find Sonic Testnet Faucet**
   - Visit Sonic Labs documentation or Discord for faucet link
   - Common faucet URL patterns:
     - https://faucet.soniclabs.com
     - Or check: https://docs.soniclabs.com

2. **Request Tokens**
   - Enter the deployer address: `0xDCBa4C636bCd0b2d8B476646df64AE621f1ED670`
   - Request testnet S tokens
   - Wait for confirmation

3. **Verify Funding**
   - Once funded, I'll check the balance
   - Then deploy the paymaster contract

---

## 🔐 Security Notes

- ⚠️ These are TEST wallets only - never use for real funds
- ✅ Private keys are stored in `.env` files (gitignored)
- ✅ Never commit `.env` files to Git
- ✅ These wallets are for Sonic TESTNET only

---

## What Happens Next

Once the deployer wallet is funded:

1. ✅ I'll verify the balance
2. ✅ Deploy SortedPaymaster to Sonic testnet
3. ✅ Fund the paymaster with a small amount (0.1 S)
4. ✅ Save the paymaster address to `backend/.env`
5. ✅ Provide deployment summary with explorer link

Then we can proceed to Phase 3 (Backend) or continue with deployment verification.

---

## Check Balance

You can check if the wallet is funded at:
- Sonic Testnet Explorer: https://testnet.soniclabs.com/address/0xDCBa4C636bCd0b2d8B476646df64AE621f1ED670

---

**Let me know once you've funded the deployer wallet and I'll deploy the paymaster!**
