# Quick Start

Get gasless transactions working in your game.

## 1. Create an account

Go to [sorted.fund](https://sorted.fund) and sign up.

## 2. Create a project

In the dashboard, create a project. You'll get:

- A **Project ID** — identifies your game
- A **Deposit Address** — where you send funds to cover gas

## 3. Get an API key

Go to **API Keys** and generate one. Save it — you won't see it again.

```
sk_sorted_abc123...
```

## 4. Add contracts to your allowlist

Go to **Allowlist** and add your contract addresses and function selectors.

Example for a mint function:

| Field | Value |
|-------|-------|
| Contract | `0xYourContract...` |
| Selector | `0x40c10f19` |

::: tip Finding function selectors
The selector is the first 4 bytes of the keccak256 hash of the function signature.

```javascript
// Using ethers.js
const iface = new ethers.Interface(abi);
const selector = iface.getFunction('mint').selector;
// Returns: "0x40c10f19"
```
:::

## 5. Fund your gas tank

Send testnet tokens to your project's deposit address. The dashboard shows your balance.

## 6. Integrate the API

When a user triggers an on-chain action, call our API:

```typescript
const response = await fetch('https://sorted-backend.onrender.com/sponsor/authorize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    projectId: 'your-project-id',
    user: '0xUserAddress',
    target: '0xYourContract',
    selector: '0x40c10f19',
    estimatedGas: 100000,
    chainId: 14601
  })
});

const { paymasterAndData, signature } = await response.json();
```

## 7. Submit the transaction

Use the returned `paymasterAndData` in your UserOperation and submit to a bundler.

::: info Coming soon
Our SDK will handle steps 6-7 automatically. For now, see [API Reference](/api-reference) for full details.
:::

## Test it

Try the [Live Demo](https://sorted.fund/demo.html) to see a gasless transaction execute on Sonic testnet.

## Next steps

- [How It Works](/how-it-works) — Understand the flow
- [API Reference](/api-reference) — Full endpoint documentation
