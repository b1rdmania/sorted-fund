# Examples

Integration examples for common use cases.

::: info Note
Examples using `sorted.authorize()` show the planned SDK syntax. For now, use the [REST API](/api-reference) directly as shown in the "Basic" example.
:::

## Basic: Mint an NFT

User clicks "Mint" → NFT mints → User pays nothing.

```typescript
// Your backend
async function handleMint(userId: string, tokenId: number) {
  // 1. Get authorization from Sorted
  const authResponse = await fetch('https://sorted-backend.onrender.com/sponsor/authorize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SORTED_API_KEY}`
    },
    body: JSON.stringify({
      projectId: 'my-game',
      user: userId,
      target: NFT_CONTRACT_ADDRESS,
      selector: '0x40c10f19', // mint(address,uint256)
      estimatedGas: 150000,
      chainId: 14601
    })
  });

  const { paymasterAndData } = await authResponse.json();

  // 2. Build and submit UserOperation
  // (Using your preferred AA SDK)
  const userOp = await buildUserOp({
    sender: userSmartWallet,
    callData: encodeMintCall(userId, tokenId),
    paymasterAndData
  });

  const txHash = await bundler.sendUserOperation(userOp);

  return txHash;
}
```

## Game: In-game purchase

Player buys an item → Item transfers → Player's game balance updates.

```typescript
async function purchaseItem(player: string, itemId: number, price: number) {
  // Deduct from in-game balance (your database)
  await deductBalance(player, price);

  // Sponsor the on-chain transfer
  const auth = await sorted.authorize({
    user: player,
    target: GAME_ITEMS_CONTRACT,
    selector: '0x...',  // transferItem(address,uint256)
    estimatedGas: 100000
  });

  // Submit gasless transaction
  const tx = await submitUserOp(auth.paymasterAndData);

  // Grant item on success
  if (tx.success) {
    await grantItem(player, itemId);
  }
}
```

## React: Gasless button component

```tsx
import { useState } from 'react';

function GaslessButton({
  contract,
  functionName,
  args,
  children
}: {
  contract: string;
  functionName: string;
  args: any[];
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);

    try {
      // Call your backend which handles Sorted auth
      const response = await fetch('/api/sponsor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract, functionName, args })
      });

      const { transactionHash } = await response.json();
      setTxHash(transactionHash);
    } catch (error) {
      console.error('Transaction failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? 'Processing...' : children}
      {txHash && <span>✓</span>}
    </button>
  );
}

// Usage
<GaslessButton
  contract="0x..."
  functionName="mint"
  args={[tokenId, amount]}
>
  Mint NFT
</GaslessButton>
```

## Node.js: Batch operations

Sponsor multiple transactions for different users.

```typescript
async function batchAirdrop(recipients: string[], amounts: number[]) {
  const results = await Promise.all(
    recipients.map(async (recipient, i) => {
      try {
        const auth = await sorted.authorize({
          user: recipient,
          target: TOKEN_CONTRACT,
          selector: '0xa9059cbb', // transfer
          estimatedGas: 65000
        });

        return { recipient, status: 'authorized', auth };
      } catch (error) {
        return { recipient, status: 'failed', error: error.message };
      }
    })
  );

  // Submit all authorized transactions
  const authorized = results.filter(r => r.status === 'authorized');
  // ... submit to bundler
}
```

## Finding function selectors

```typescript
import { ethers } from 'ethers';

// From ABI
const iface = new ethers.Interface(contractABI);
const selector = iface.getFunction('mint').selector;

// Manual calculation
const signature = 'mint(address,uint256)';
const hash = ethers.keccak256(ethers.toUtf8Bytes(signature));
const selector = hash.slice(0, 10); // 0x + 8 hex chars
```

### Common selectors

| Function | Selector |
|----------|----------|
| `transfer(address,uint256)` | `0xa9059cbb` |
| `approve(address,uint256)` | `0x095ea7b3` |
| `mint(address,uint256)` | `0x40c10f19` |
| `burn(uint256)` | `0x42966c68` |
| `safeTransferFrom(address,address,uint256)` | `0x42842e0e` |
