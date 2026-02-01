# Introduction

Sorted lets you pay gas fees so your users don't have to.

## The problem

Web3 games have a friction problem. Before a player can do anything on-chain, they need to:

1. Get a wallet
2. Buy tokens
3. Understand gas fees
4. Approve transactions

Most players leave before step 2.

## The solution

You fund a gas tank. We sponsor transactions for your allowlisted contracts. Players just play.

```typescript
const tx = await sorted.sponsor({
  user: '0x...',
  contract: '0x...',
  function: 'mint',
  args: [tokenId, amount]
});

// User paid: $0.00
```

That's the whole integration.

## How it works

1. **You allowlist contracts** — Only transactions to your approved contracts get sponsored
2. **Player triggers an action** — Click a button, complete a quest, whatever
3. **We pay the gas** — Transaction executes on-chain, player pays nothing
4. **You see analytics** — Track usage, spending, active users

## What you get

- **Dashboard** — Manage allowlists, API keys, and view analytics
- **API** — Authorize transactions with one endpoint
- **SDK** — TypeScript client for easy integration (coming soon)

## What it costs

You pay the gas your users would have paid, plus a small fee. Pricing details TBD — we're in testnet.

## Supported chains

Live on **Sonic Testnet** (Chain ID 14601). More chains planned.

## Next steps

→ [Quick Start](/quick-start) — Set up your first project
