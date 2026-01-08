# @sorted/sdk

Official TypeScript SDK for [Sorted.fund](https://github.com/b1rdmania/sorted-fund) - Gasless transactions on Sonic testnet using ERC-4337 Account Abstraction.

## Features

- ✅ **High-level API** - Send gasless transactions with one function call (`sendSponsoredTx`)
- ✅ **Low-level API** - Full control with `authorize()` + manual UserOperation building
- ✅ **ERC-4337 v0.7** - Complete support for latest Account Abstraction standard
- ✅ **Pimlico Integration** - Built-in bundler support with status polling
- ✅ **UserOperation Builder** - Helper class for building and signing UserOperations
- ✅ **Type-Safe** - Full TypeScript support with comprehensive types
- ✅ **Error Handling** - Custom error classes with detailed information

## Installation

```bash
npm install @sorted/sdk ethers
# or
yarn add @sorted/sdk ethers
```

## Quick Start

### High-Level API (Easiest)

```typescript
import { ethers } from 'ethers';
import { SortedClient } from '@sorted/sdk';

// 1. Setup provider and account owner
const provider = new ethers.JsonRpcProvider('https://rpc.testnet.soniclabs.com');
const accountOwner = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

// 2. Initialize SDK
const sorted = new SortedClient({
  apiKey: process.env.SORTED_API_KEY!,
  backendUrl: 'http://localhost:3000',
  pimlicoApiKey: process.env.PIMLICO_API_KEY!,
  chainId: 14601,
  provider, // Required for sendSponsoredTx()
});

// 3. Prepare your transaction
const targetContract = '0xYourContractAddress';
const iface = new ethers.Interface(['function yourFunction()']);
const callData = iface.encodeFunctionData('yourFunction');

// 4. Send gasless transaction - handles everything!
const receipt = await sorted.sendSponsoredTx({
  projectId: 'your-project-id',
  account: '0xYourSmartAccountAddress',
  accountSigner: accountOwner,
  target: targetContract,
  selector: '0xYourFunctionSelector',
  data: callData,
});

console.log(`✅ Transaction confirmed: ${receipt.transactionHash}`);
console.log(`Gas sponsored: ${receipt.actualGasCost} wei`);
```

### Low-Level API (Advanced)

For more control, build UserOperations manually:

```typescript
import { SortedClient, UserOperationBuilder } from '@sorted/sdk';

const sorted = new SortedClient({
  apiKey: 'sk_sorted_your_api_key_here',
  backendUrl: 'http://localhost:3000',
  pimlicoApiKey: 'your_pimlico_api_key',
});

// Step 1: Authorize sponsorship
const auth = await sorted.authorize({
  projectId: 'my-game',
  user: '0xSmartAccountAddress',
  target: '0xTargetContract',
  selector: '0x12345678',
  estimatedGas: 200000,
  clientNonce: Date.now().toString(),
});

// Step 2: Build and sign UserOperation with your smart account library
// (using permissionless.js, ethers, etc.)
const userOp = {
  // ... build UserOperation
  paymasterAndData: auth.paymasterAndData, // ⭐ From Sorted!
};

// Step 3: Submit to bundler
const userOpHash = await sorted.submitUserOperation(userOp);

// Step 4: Wait for confirmation
const receipt = await sorted.waitForUserOp(userOpHash);
console.log(`Transaction hash: ${receipt.transactionHash}`);
```

## API Reference

### SortedClient

#### Constructor

```typescript
new SortedClient(config: SortedConfig)
```

**Config:**
```typescript
interface SortedConfig {
  apiKey: string;                // Your Sorted API key
  backendUrl: string;            // Sorted backend URL
  pimlicoApiKey?: string;        // Pimlico bundler API key (optional)
  chainId?: number;              // Chain ID (default: 14601 for Sonic testnet)
  provider?: ethers.Provider;    // Optional: for sendSponsoredTx() and UserOpBuilder
  entryPointAddress?: string;    // Optional: EntryPoint v0.7 address
}
```

### Methods

#### `sendSponsoredTx(params: SponsoredTxParams): Promise<TransactionReceipt>`

**High-level helper** that handles the complete gasless transaction flow:
1. Fetches account nonce from EntryPoint
2. Encodes execute call for SimpleAccount
3. Authorizes with backend
4. Builds UserOperation
5. Signs with account owner
6. Submits to Pimlico bundler
7. Waits for confirmation

**Requirements:**
- `provider` must be set in config
- `pimlicoApiKey` must be set in config

**Params:**
```typescript
interface SponsoredTxParams {
  projectId: string;                 // Your project ID
  account: string;                   // Smart account address
  accountSigner: ethers.Signer;      // EOA that owns the smart account
  target: string;                    // Contract address to call
  selector: string;                  // Function selector (e.g., "0xd09de08a")
  data: string;                      // Encoded function call data
  value?: bigint;                    // ETH value to send (default: 0n)
  nonce?: bigint;                    // Optional: account nonce (fetched if not provided)
  estimatedGas?: number;             // Optional: for authorization (default: 500000)
}
```

**Returns:**
```typescript
interface TransactionReceipt {
  userOpHash: string;
  transactionHash?: string;
  blockNumber?: number;
  blockHash?: string;
  success: boolean;
  actualGasCost?: bigint;           // Gas cost in wei
  actualGasUsed?: bigint;           // Gas units used
  logs?: any[];
  reason?: string;                  // If failed
}
```

**Example:**
```typescript
const targetContract = '0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3';
const iface = new ethers.Interface(['function increment()']);
const callData = iface.encodeFunctionData('increment');

const receipt = await sorted.sendSponsoredTx({
  projectId: 'test-game',
  account: '0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506',
  accountSigner: wallet,
  target: targetContract,
  selector: '0xd09de08a', // increment()
  data: callData,
});

console.log(`Confirmed in block ${receipt.blockNumber}`);
console.log(`Gas sponsored: ${receipt.actualGasCost} wei`);
```

#### `authorize(params: AuthorizeParams): Promise<AuthorizeResponse>`

Request sponsorship authorization from Sorted backend.

**Params:**
```typescript
interface AuthorizeParams {
  projectId: string;      // Your project ID
  user: string;           // Smart account address
  target: string;         // Target contract address
  selector: string;       // Function selector (e.g., '0x12345678')
  estimatedGas: number;   // Estimated gas for the operation
  clientNonce: string;    // Nonce from smart account
}
```

**Returns:**
```typescript
interface AuthorizeResponse {
  paymasterAndData: string;  // Signed payload for UserOperation (187 bytes)
  expiresAt: string;         // Expiry timestamp (ISO format)
  maxCost: string;           // Maximum cost in wei (hex)
  policyHash: string;        // Policy hash
}
```

**Example:**
```typescript
const auth = await sorted.authorize({
  projectId: 'my-game',
  user: '0x9876543210987654321098765432109876543210',
  target: '0x1111111111111111111111111111111111111111',
  selector: '0x12345678',
  estimatedGas: 200000,
  clientNonce: '0x1',
});

// Attach to your UserOperation
userOp.paymasterAndData = auth.paymasterAndData;
```

#### `submitUserOperation(userOp: UserOperation): Promise<string>`

Submit a UserOperation to Pimlico bundler.

**Returns:** `userOpHash` (string)

**Example:**
```typescript
const userOpHash = await sorted.submitUserOperation(userOp);
console.log('UserOp submitted:', userOpHash);
```

#### `getUserOpReceipt(userOpHash: string): Promise<PimlicoUserOpReceipt | null>`

Get UserOperation receipt from bundler.

**Example:**
```typescript
const receipt = await sorted.getUserOpReceipt(userOpHash);
if (receipt) {
  console.log('Transaction hash:', receipt.receipt.transactionHash);
  console.log('Success:', receipt.success);
}
```

#### `getUserOpStatus(userOpHash: string): Promise<PimlicoUserOpStatus>`

Get UserOperation status.

**Returns:**
```typescript
interface PimlicoUserOpStatus {
  status: 'pending' | 'included' | 'rejected' | 'failed';
  transactionHash?: string;
}
```

#### `waitForUserOp(userOpHash: string, timeout?: number): Promise<TransactionReceipt>`

Wait for UserOperation to be included on-chain.

**Params:**
- `userOpHash`: The UserOp hash to wait for
- `timeout`: Maximum wait time in ms (default: 60000)

**Returns:**
```typescript
interface TransactionReceipt {
  userOpHash: string;
  transactionHash?: string;
  blockNumber?: number;
  blockHash?: string;
  success: boolean;
  actualGasCost?: bigint;
  actualGasUsed?: bigint;
  logs?: any[];
  reason?: string;
}
```

**Example:**
```typescript
const userOpHash = await sorted.submitUserOperation(userOp);
const receipt = await sorted.waitForUserOp(userOpHash);

if (receipt.success) {
  console.log('✅ Transaction confirmed!');
  console.log('TX Hash:', receipt.transactionHash);
  console.log('Gas used:', receipt.actualGasUsed);
} else {
  console.log('❌ Transaction failed:', receipt.reason);
}
```

#### `estimateUserOpGas(userOp: Partial<UserOperation>): Promise<GasEstimate>`

Estimate gas for a UserOperation.

**Returns:**
```typescript
{
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
}
```

## Error Handling

The SDK provides custom error classes:

```typescript
import { AuthorizationError, BundlerError } from '@sorted/sdk';

try {
  const auth = await sorted.authorize(params);
} catch (error) {
  if (error instanceof AuthorizationError) {
    console.error('Authorization failed:', error.message);
    console.error('Details:', error.details);
  } else if (error instanceof BundlerError) {
    console.error('Bundler error:', error.message);
  }
}
```

## Full Example: Sponsored Transaction

```typescript
import { SortedClient } from '@sorted/sdk';
import { encodeFunctionData } from 'viem'; // or ethers

// Initialize
const sorted = new SortedClient({
  apiKey: process.env.SORTED_API_KEY!,
  backendUrl: 'https://api.sorted.fund',
  pimlicoApiKey: process.env.PIMLICO_API_KEY!,
});

async function sendSponsoredTx() {
  try {
    // 1. Prepare call data
    const callData = encodeFunctionData({
      abi: contractAbi,
      functionName: 'mint',
      args: [recipient, amount],
    });

    const target = '0xYourContractAddress';
    const selector = callData.slice(0, 10); // '0x40c10f19' for mint()

    // 2. Get authorization
    const auth = await sorted.authorize({
      projectId: 'my-game',
      user: smartAccountAddress,
      target,
      selector,
      estimatedGas: 200000,
      clientNonce: await getAccountNonce(smartAccountAddress),
    });

    console.log('✅ Authorization received');

    // 3. Build UserOperation
    const userOp = {
      sender: smartAccountAddress,
      nonce: accountNonce,
      initCode: '0x',
      callData: buildExecuteCallData(target, 0n, callData),
      accountGasLimits: packGasLimits(200000, 100000),
      preVerificationGas: 50000n,
      gasFees: packGasFees(1000000000n, 1000000000n),
      paymasterAndData: auth.paymasterAndData, // ⭐ From Sorted!
      signature: '0x', // Will be signed by smart account
    };

    // Sign the UserOp with your smart account
    userOp.signature = await signUserOp(userOp);

    // 4. Submit to bundler
    const userOpHash = await sorted.submitUserOperation(userOp);
    console.log('✅ UserOp submitted:', userOpHash);

    // 5. Wait for confirmation
    const receipt = await sorted.waitForUserOp(userOpHash);

    if (receipt.success) {
      console.log('🎉 Transaction successful!');
      console.log('TX:', receipt.transactionHash);
      console.log('Block:', receipt.blockNumber);
      console.log('Gas used:', receipt.actualGasUsed);
    } else {
      console.error('❌ Transaction failed:', receipt.reason);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

sendSponsoredTx();
```

## Integration with Account Abstraction Libraries

### With Permissionless.js

```typescript
import { createSmartAccountClient } from 'permissionless';
import { SortedClient } from '@sorted/sdk';

const sorted = new SortedClient({
  apiKey: process.env.SORTED_API_KEY!,
  backendUrl: 'https://api.sorted.fund',
});

// Create smart account client with Sorted paymaster
const client = await createSmartAccountClient({
  // ... account config
  middleware: {
    sponsorUserOperation: async ({ userOperation }) => {
      // Get authorization from Sorted
      const auth = await sorted.authorize({
        projectId: 'my-game',
        user: userOperation.sender,
        target: extractTarget(userOperation.callData),
        selector: extractSelector(userOperation.callData),
        estimatedGas: estimateGas(userOperation),
        clientNonce: userOperation.nonce.toString(),
      });

      // Attach paymasterAndData
      return {
        ...userOperation,
        paymasterAndData: auth.paymasterAndData,
      };
    },
  },
});
```

## Environment Variables

```bash
# .env
SORTED_API_KEY=sk_sorted_your_key_here
PIMLICO_API_KEY=your_pimlico_key_here
SORTED_BACKEND_URL=http://localhost:3000  # or production URL
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import type {
  SortedConfig,
  AuthorizeParams,
  AuthorizeResponse,
  UserOperation,
  TransactionReceipt,
  PimlicoUserOpReceipt,
} from '@sorted/sdk';
```

## Requirements

- Node.js >= 18
- TypeScript >= 5.0 (if using TypeScript)

## Links

- **Documentation**: https://docs.sorted.fund
- **GitHub**: https://github.com/sorted-fund/sdk
- **Discord**: https://discord.gg/sorted
- **Website**: https://sorted.fund

## License

MIT

## Support

- Discord: https://discord.gg/sorted
- Email: support@sorted.fund
- GitHub Issues: https://github.com/sorted-fund/sdk/issues
