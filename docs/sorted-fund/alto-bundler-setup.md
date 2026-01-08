# Alto Bundler Setup for Sonic Testnet

This guide explains how to run the Alto bundler locally for Sonic testnet integration testing.

## Why Alto?

Pimlico's hosted bundler service doesn't currently support Sonic testnet. Alto is Pimlico's open-source bundler that can be configured to work with any EVM network, including Sonic testnet.

## Prerequisites

- Node.js 18+
- pnpm (install with: `npm install -g pnpm`)
- Sonic testnet RPC access
- Funded executor wallets (for bundling transactions)

## Installation

### 1. Clone Alto Repository

```bash
cd bundler
git clone https://github.com/pimlicolabs/alto.git
cd alto
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Build Smart Contracts

```bash
pnpm run build:contracts
```

### 4. Build Alto

```bash
pnpm run build
```

## Configuration

### Create Sonic Testnet Config

Create `config.sonic-testnet.json`:

```json
{
  "network-name": "sonic-testnet",
  "rpc-url": "https://rpc.testnet.soniclabs.com",
  "chain-id": 14601,
  "entrypoints": "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
  "min-entity-stake": 1,
  "min-executor-balance": "100000000000000000",
  "min-entity-unstake-delay": 1,
  "max-bundle-wait": 5,
  "max-bundle-size": 5,
  "max-block-range": 500,
  "port": 4337,
  "executor-private-keys": "YOUR_EXECUTOR_PRIVATE_KEY_1,YOUR_EXECUTOR_PRIVATE_KEY_2",
  "utility-private-key": "YOUR_UTILITY_PRIVATE_KEY",
  "deploy-simulations-contract": false,
  "enable-debug-endpoints": true,
  "safe-mode": false,
  "mempool-max-parallel-ops": 10,
  "mempool-max-queued-ops": 20,
  "enforce-unique-senders-per-bundle": false
}
```

### Configuration Parameters Explained

| Parameter | Description | Recommended Value |
|-----------|-------------|-------------------|
| `network-name` | Network identifier | `"sonic-testnet"` |
| `rpc-url` | Sonic testnet RPC endpoint | `"https://rpc.testnet.soniclabs.com"` |
| `chain-id` | Sonic testnet chain ID | `14601` |
| `entrypoints` | EntryPoint v0.7 address | `"0x0000000071727De22E5E9d8BAf0edAc6f37da032"` |
| `executor-private-keys` | Private keys for bundler executors (comma-separated) | Fund with ~0.5 S each |
| `utility-private-key` | Private key for utility operations | Fund with ~0.1 S |
| `port` | Bundler RPC port | `4337` (standard) |
| `safe-mode` | Enable ERC-7562 reputation checks | `false` (for testing) |
| `max-bundle-wait` | Max seconds to wait before bundling | `5` |
| `max-bundle-size` | Max UserOps per bundle | `5` |

### Generate Executor Wallets

Generate test wallets for the bundler:

```bash
# Install wallet generator
npm install -g ethereum-wallet-generator

# Generate 2 executor wallets
wallet-generate -n 2

# Or use ethers.js
node -e "const ethers = require('ethers'); const wallet = ethers.Wallet.createRandom(); console.log('Address:', wallet.address); console.log('Private key:', wallet.privateKey);"
```

**Important:** Fund these wallets with Sonic testnet tokens:
- **Executor wallets**: ~0.5 S each (for gas to submit bundles)
- **Utility wallet**: ~0.1 S (for utility operations)

Get testnet tokens from [Sonic Faucet](https://testnet.soniclabs.com/faucet)

## Running Alto

### Start the Bundler

```bash
cd bundler/alto
pnpm start --config config.sonic-testnet.json
```

You should see:

```
Alto bundler starting...
Network: sonic-testnet (14601)
EntryPoint: 0x0000000071727De22E5E9d8BAf0edAc6f37da032
RPC endpoint: http://localhost:4337
Executor addresses: 0x...
Ready to accept UserOperations
```

### Test Bundler Connection

```bash
# Check bundler is running
curl -X POST http://localhost:4337 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'

# Expected response:
# {"jsonrpc":"2.0","id":1,"result":"0x3959"} (14601 in hex)
```

### Verify EntryPoint

```bash
curl -X POST http://localhost:4337 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_supportedEntryPoints","params":[]}'

# Expected response:
# {"jsonrpc":"2.0","id":1,"result":["0x0000000071727De22E5E9d8BAf0edAc6f37da032"]}
```

## Configuring SDK to Use Alto

Update your SDK configuration to point to the local bundler:

```typescript
const client = new SortedClient({
  apiKey: process.env.SORTED_API_KEY!,
  backendUrl: 'http://localhost:3000',
  pimlicoApiKey: '', // Not needed for local Alto
  chainId: 14601,
  provider: new ethers.JsonRpcProvider('https://rpc.testnet.soniclabs.com'),
});

// Override Pimlico client to point to Alto
client['pimlicoClient'] = axios.create({
  baseURL: 'http://localhost:4337',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});
```

Or create a dedicated Alto client in the SDK.

## Testing End-to-End Flow

With Alto running, test the complete flow:

```bash
cd sdk
export SORTED_API_KEY=sk_sorted_...
export ACCOUNT_OWNER_KEY=0x...

npx ts-node examples/node/test-integration.ts
```

Expected flow:
1. ✅ SDK calls backend `/sponsor/authorize`
2. ✅ Backend returns signed `paymasterAndData`
3. ✅ SDK builds and signs UserOperation
4. ✅ SDK submits to Alto bundler (`eth_sendUserOperation`)
5. ✅ Alto validates and bundles UserOperation
6. ✅ Alto submits bundle to EntryPoint on Sonic testnet
7. ✅ Transaction confirmed on-chain
8. ✅ SDK calls backend `/sponsor/reconcile` with actual gas

## Monitoring & Debugging

### Alto Logs

Alto provides detailed logs:

```
[INFO] UserOperation received: 0xabc...
[INFO] Validating UserOperation...
[INFO] UserOperation added to mempool
[INFO] Creating bundle with 1 UserOperation(s)
[INFO] Submitting bundle to EntryPoint...
[INFO] Bundle confirmed in block 12345
```

### Enable Verbose Logging

```bash
pnpm start --config config.sonic-testnet.json --verbose
```

### Check Bundler Metrics

Alto exposes Prometheus metrics on port `http://localhost:4337/metrics`

### Common Issues

#### Issue: "Executor balance too low"
**Solution:** Fund executor wallets with more S tokens

#### Issue: "UserOperation validation failed"
**Solution:** Check paymaster signature, gas limits, and allowlist

#### Issue: "Cannot connect to RPC"
**Solution:** Verify Sonic testnet RPC is accessible: `curl https://rpc.testnet.soniclabs.com`

#### Issue: "EntryPoint not found"
**Solution:** Verify EntryPoint is deployed at `0x0000000071727De22E5E9d8BAf0edAc6f37da032`

## Production Considerations

For production deployment:

1. **Use hosted Pimlico** once Sonic is supported
2. **Run Alto with `safe-mode: true`** for reputation checks
3. **Monitor executor balances** and auto-refill when low
4. **Use multiple executors** for redundancy
5. **Set up alerts** for failed bundles
6. **Enable rate limiting** to prevent abuse

## Alternative: Deploy to Railway

Alto can be deployed to Railway with one click:

https://railway.com/template/Uii9K8

Configure environment variables:
- `RPC_URL`: https://rpc.testnet.soniclabs.com
- `EXECUTOR_PRIVATE_KEYS`: Comma-separated private keys
- `ENTRYPOINT`: 0x0000000071727De22E5E9d8BAf0edAc6f37da032
- `CHAIN_ID`: 14601

## Resources

- [Alto GitHub](https://github.com/pimlicolabs/alto)
- [Alto Documentation](https://docs.pimlico.io/infra/bundler)
- [Self-Hosting Guide](https://docs.pimlico.io/references/bundler/self-host)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Sonic Testnet Documentation](https://docs.soniclabs.com)

## Next Steps

Once Alto is running and you've successfully submitted a UserOperation:

1. Monitor gas usage accuracy in backend analytics
2. Run error path tests (allowlist blocking, insufficient balance, etc.)
3. Benchmark transaction latency
4. Stress test with multiple concurrent UserOperations
5. Document findings and optimize gas estimation

---

**Note:** This setup is for **testnet development only**. For production, use Pimlico's hosted service once Sonic is supported, or deploy Alto with proper security hardening, monitoring, and redundancy.
