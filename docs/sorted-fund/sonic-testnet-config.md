# Sonic Testnet Configuration

This document captures all configuration details for Sonic testnet integration.

## Network Details

| Parameter | Value |
|-----------|-------|
| Network Name | Sonic Testnet |
| Chain ID | 14601 |
| RPC URL | https://rpc.testnet.soniclabs.com |
| Explorer | https://testnet.soniclabs.com |
| Currency Symbol | S |
| Block Time | ~1 second |

## ERC-4337 EntryPoint v0.7

| Parameter | Value |
|-----------|-------|
| Address | `0x0000000071727de22e5e9d8baf0edac6f37da032` |
| Version | 0.7 |
| Deployment | Pre-deployed by Sonic Labs |

## Gas Pricing

Based on [Sonic gas pricing docs](https://docs.soniclabs.com/sonic/build-on-sonic/gas-pricing):

- **Base Fee**: ~50 GWei (predictable)
- **Priority Fee**: ~1 wei (minimal tips)
- **Total**: Base fee + priority fee

## Faucet & Test Tokens

To get testnet S tokens:
1. Visit the Sonic testnet faucet
2. Request testnet tokens with your wallet address
3. Wait for confirmation

## RPC Endpoints

### Public RPC
```
https://rpc.testnet.soniclabs.com
```

### WebSocket (if needed)
```
wss://rpc.testnet.soniclabs.com
```

## Adding to MetaMask

1. Open MetaMask
2. Click Network dropdown → "Add Network"
3. Enter details:
   - Network Name: Sonic Testnet
   - RPC URL: https://rpc.testnet.soniclabs.com
   - Chain ID: 64165
   - Currency Symbol: S
   - Block Explorer: https://testnet.soniclabs.com

## Pimlico Bundler Setup

To use Pimlico bundler on Sonic testnet:

1. Create Pimlico account at https://dashboard.pimlico.io
2. Create API key via dashboard or CLI:
   ```bash
   pnpm dlx @pimlico/cli@latest
   ```
3. Configure for Sonic testnet (chain ID: 64165)
4. Store API key in backend `.env` as `PIMLICO_API_KEY`

### Pimlico RPC Endpoints

- `eth_sendUserOperation` - Submit UserOps
- `eth_estimateUserOperationGas` - Estimate gas
- `pimlico_getUserOperationStatus` - Check status
- `eth_getUserOperationReceipt` - Get receipt

## Important Addresses

### EntryPoint v0.7
```
0x0000000071727de22e5e9d8baf0edac6f37da032
```

This is the canonical EntryPoint contract for ERC-4337 v0.7 on Sonic testnet.

### Sorted Paymaster
(To be deployed in Phase 2)

### Test Contracts
(To be deployed during testing)

## Verification

Before proceeding with development, verify:

- [ ] RPC endpoint is accessible
- [ ] EntryPoint contract exists at the documented address
- [ ] Test wallet has testnet S tokens
- [ ] Pimlico API key is valid and configured for Sonic testnet

## References

- [Sonic Account Abstraction Docs](https://docs.soniclabs.com/technology/pectra-compatibility/account-abstraction)
- [Alternative Fee Payments](https://docs.soniclabs.com/technology/pectra-compatibility/alternative-fee-payments)
- [Gas Pricing](https://docs.soniclabs.com/sonic/build-on-sonic/gas-pricing)
- [Pimlico Documentation](https://docs.pimlico.io)

## Testing Connectivity

Run the connectivity test script (to be created):
```bash
cd backend
npm run test:connectivity
```

This will verify:
1. RPC endpoint responds
2. Chain ID matches expected value
3. EntryPoint contract is deployed
4. Gas price estimation works
