# Pimlico API Key Setup Guide

**Required for:** Phase 5 End-to-End Integration Testing

---

## What is Pimlico?

Pimlico is a bundler service for ERC-4337 Account Abstraction. It:
- Accepts UserOperations from clients
- Bundles them into transactions
- Submits to the blockchain
- Returns transaction receipts

For Sorted.fund, Pimlico handles the actual on-chain submission of sponsored UserOperations.

---

## Getting a Pimlico API Key

### Step 1: Sign Up

Visit https://dashboard.pimlico.io and create an account.

### Step 2: Create API Key

1. Log in to the dashboard
2. Click "Create API Key"  or "New Project"
3. Give it a name (e.g., "Sorted.fund Testing")
4. Select the chains you need access to

### Step 3: Enable Sonic Testnet

**IMPORTANT:** You need to enable **Sonic Testnet (Chain ID: 14601)**

- In the API key settings, look for chain selection
- Enable Sonic testnet
- Sonic testnet should be available in Pimlico's supported chains

**Note:** If Sonic testnet (14601) is not available:
- Contact Pimlico support to request Sonic testnet access
- Alternative: Use a different bundler that supports Sonic testnet
- Check Sonic Labs documentation for recommended bundlers

### Step 4: Copy API Key

Copy your API key. It will look something like:
```
pim_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 5: Add to Environment Variables

Add to your `.env` files:

**contracts/.env:**
```bash
PIMLICO_API_KEY=pim_your_api_key_here
```

**sdk/.env:**
```bash
PIMLICO_API_KEY=pim_your_api_key_here
```

---

## Verifying API Key

Test your API key with a simple curl request:

```bash
curl -X POST "https://api.pimlico.io/v2/14601/rpc?apikey=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "pimlico_getUserOperationGasPrice",
    "params": []
  }'
```

Expected response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "slow": { "maxFeePerGas": "...", "maxPriorityFeePerGas": "..." },
    "standard": { "maxFeePerGas": "...", "maxPriorityFeePerGas": "..." },
    "fast": { "maxFeePerGas": "...", "maxPriorityFeePerGas": "..." }
  }
}
```

---

## Pimlico Pricing (as of 2026)

Pimlico offers:
- **Free Tier**: Limited requests per month (good for testing)
- **Pay-as-you-go**: Per UserOperation pricing
- **Enterprise**: Custom pricing

For testnet development, the free tier should be sufficient.

---

## Alternative Bundlers

If Pimlico doesn't support Sonic testnet (14601), alternatives include:

1. **Alchemy Account Kit**
   - https://www.alchemy.com/account-kit
   - Check if Sonic testnet is supported

2. **Stackup**
   - https://www.stackup.sh
   - Open-source bundler option

3. **Candide**
   - https://www.candide.dev
   - Supports multiple chains

4. **Run Your Own Bundler**
   - https://github.com/eth-infinitism/bundler
   - Reference implementation
   - Requires running a server

---

## Sonic Testnet Bundler Info

**Check with Sonic Labs:**
- Documentation: https://docs.soniclabs.com (or relevant docs site)
- Discord: Ask in Sonic Labs community
- They may provide a recommended bundler endpoint

**If Sonic provides a bundler:**
You might be able to use it directly without Pimlico. In that case:
1. Get the bundler RPC URL from Sonic
2. Update the SDK to point to that URL instead of Pimlico
3. The integration test should work the same way

---

## Troubleshooting

### "Chain not supported" error
- Verify Sonic testnet (14601) is enabled in your Pimlico account
- Check Pimlico documentation for supported chains
- Contact Pimlico support

### "Invalid API key" error
- Double-check the API key is copied correctly
- Ensure no extra spaces or quotes
- Verify the key is active in the dashboard

### "Rate limit exceeded" error
- You've hit the free tier limit
- Upgrade your plan or wait for the limit to reset
- Create a new account for more free credits (testing only)

---

## SDK Integration

Once you have the API key, the Sorted SDK will automatically use it:

```typescript
const sorted = new SortedClient({
  apiKey: process.env.SORTED_API_KEY!,
  backendUrl: 'http://localhost:3000',
  pimlicoApiKey: process.env.PIMLICO_API_KEY!, // ← Add this
  chainId: 14601,
});

// Submit UserOperation to Pimlico
const userOpHash = await sorted.submitUserOperation(userOp);

// Wait for confirmation
const receipt = await sorted.waitForUserOp(userOpHash);
```

---

## Next Steps After Getting API Key

1. Add PIMLICO_API_KEY to `.env` files
2. Run the integration test:
   ```bash
   cd contracts
   npx hardhat run scripts/test-integration.ts --network sonic
   ```
3. Watch for successful gasless transaction!

---

## Support

- **Pimlico Discord:** https://discord.gg/pimlico
- **Pimlico Docs:** https://docs.pimlico.io
- **Pimlico Support:** support@pimlico.io

---

**Once you have your Pimlico API key, Phase 5 testing can begin!** 🚀
