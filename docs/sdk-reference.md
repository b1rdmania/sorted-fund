# SDK Reference

::: warning Planned — Not Yet Available
The TypeScript SDK is under development. The examples below show the **planned API design**. For now, use the [REST API directly](/api-reference).
:::

## Planned Installation

```bash
npm install @sorted/sdk  # Not yet published
```

## Planned Usage

```typescript
import { SortedClient } from '@sorted/sdk';

const sorted = new SortedClient({
  apiKey: 'sk_sorted_your_api_key',
  projectId: 'your-project-id',
  chainId: 14601
});

// Sponsor a transaction
const result = await sorted.sponsor({
  user: '0xUserAddress',
  contract: '0xYourContract',
  function: 'mint',
  args: [tokenId, amount]
});

console.log(result.transactionHash);
```

## Planned Methods

### `sponsor(options)`

Sponsor a gasless transaction.

**Options:**

| Field | Type | Description |
|-------|------|-------------|
| `user` | address | User's wallet address |
| `contract` | address | Target contract |
| `function` | string | Function name |
| `args` | array | Function arguments |

**Returns:**

```typescript
{
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
}
```

### `getBalance()`

Get your gas tank balance.

```typescript
const balance = await sorted.getBalance();
// { balance: "1000000000000000000", formatted: "1.0 S" }
```

### `getAllowlist()`

Get your allowlisted contracts.

```typescript
const entries = await sorted.getAllowlist();
```

## Planned React Hook

```typescript
import { useSorted } from '@sorted/react';

function MintButton() {
  const { sponsor, isLoading, error } = useSorted();

  const handleMint = async () => {
    await sponsor({
      contract: '0x...',
      function: 'mint',
      args: [1, 100]
    });
  };

  return (
    <button onClick={handleMint} disabled={isLoading}>
      {isLoading ? 'Minting...' : 'Mint'}
    </button>
  );
}
```

## Error Handling

```typescript
try {
  await sorted.sponsor({ ... });
} catch (error) {
  if (error.code === 'INSUFFICIENT_BALANCE') {
    console.log('Gas tank empty');
  } else if (error.code === 'NOT_ALLOWLISTED') {
    console.log('Contract not on allowlist');
  }
}
```

## TypeScript Types

```typescript
interface SponsorOptions {
  user: string;
  contract: string;
  function: string;
  args: unknown[];
}

interface SponsorResult {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
}

interface SortedConfig {
  apiKey: string;
  projectId: string;
  chainId: number;
  bundlerUrl?: string;
}
```
