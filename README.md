# Sorted.fund

**Your players click. We pay the gas.**

Gasless transaction infrastructure for Web3 games. One API call. Zero blockchain friction for your users.

## See It Working

**Live Demo:** [sorted.fund/demo.html](https://sorted.fund/demo.html) — Execute a real gasless transaction. No wallet needed.

**Proof it works:** [View this transaction on Sonic Explorer](https://testnet.sonicscan.org/tx/0x1d50b4e5deea3fc76713008df11f315fd47668520c864f6dee1660104afb77e3) — User paid $0.00. We sponsored the gas.

**Dashboard Preview:** [sorted.fund/demo-dashboard.html](https://sorted.fund/demo-dashboard.html) — See what you'll get.

---

## What Is This?

You're building a Web3 game. Your players shouldn't need to:
- Own tokens to play
- Approve transactions in wallet popups
- Understand gas fees
- Know they're even on a blockchain

**Sorted fixes this.** You fund a gas tank. We sponsor transactions for your allowlisted contracts. Players just... play.

```typescript
// That's the whole integration
const tx = await sorted.sponsor({
  user: '0x...',
  contract: '0x...',
  function: 'mint',
  args: [tokenId, amount]
});
// User paid: $0.00
```

---

## Status

### What's Working Now
- Live gasless transactions on Sonic testnet
- Developer dashboard with analytics
- API key management
- Contract allowlist controls
- Gas tank balance tracking
- Real transactions executing on-chain

### What's Next
- [ ] **Privy integration** — Wallet + social login (replacing custom auth)
- [ ] **Production database hardening** — Battle-tested account management
- [ ] **Self-service deposits** — Fund your gas tank directly
- [ ] **Mainnet deployment** — Graduate from testnet

---

## Tech Stack

| Layer | Tech |
|-------|------|
| **Smart Contracts** | ERC-4337 Account Abstraction, Verifying Paymaster |
| **Backend** | Express + TypeScript + PostgreSQL |
| **Frontend** | Static HTML/JS (deployed on Vercel) |
| **Chain** | Sonic Testnet (Chain ID: 14601) |
| **Bundler** | Alto (ERC-4337 bundler) |

### Deployed Contracts

| Contract | Address |
|----------|---------|
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| SortedPaymaster | `0x41B35AAD2e3F8c36ad883c354AEa828a2100Bb4a` |
| Test Counter | `0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3` |

---

## How It Works

```
Your Game                    Sorted                      Blockchain
    │                           │                            │
    ├── user clicks "mint" ────►│                            │
    │                           ├── validate request         │
    │                           ├── sign paymasterAndData    │
    │                           ├── submit to bundler ──────►│
    │                           │                            ├── execute
    │                           │◄── transaction confirmed ──┤
    │◄── success ───────────────┤                            │
    │                           │                            │
   User paid: $0              You paid: ~$0.001         On-chain ✓
```

---

## Quick Start (Local Dev)

```bash
# Backend (port 3000)
cd backend && npm install && npm run dev

# Frontend (port 8081)
cd frontend/dashboard-v2 && python3 -m http.server 8081

# Bundler (port 4337) — only for local E2E testing
cd bundler/alto && ./alto --config config.sonic-testnet.json
```

### Environment Variables

```bash
# backend/.env
DATABASE_URL=postgresql://...
BACKEND_SIGNER_PRIVATE_KEY=0x...
PAYMASTER_ADDRESS=0x41B35AAD2e3F8c36ad883c354AEa828a2100Bb4a
SONIC_RPC_URL=https://rpc.testnet.soniclabs.com
```

---

## Production

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | [sorted.fund](https://sorted.fund) |
| Backend | Render | sorted-backend.onrender.com |
| Database | Render PostgreSQL | (internal) |

---

## Repository Structure

```
sorted/
├── backend/           # Express API + PostgreSQL
├── contracts/         # Solidity (Paymaster, deployed)
├── sdk/              # TypeScript SDK (WIP)
├── frontend/
│   └── dashboard-v2/ # The dashboard you see at sorted.fund
├── bundler/alto/     # ERC-4337 bundler (git submodule)
└── docs/             # Architecture docs
```

---

## API Example

```bash
# Authorize a gasless transaction
curl -X POST https://sorted-backend.onrender.com/sponsor/authorize \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project",
    "user": "0x...",
    "target": "0xYourContract",
    "selector": "0x12345678",
    "estimatedGas": 500000,
    "chainId": 14601
  }'
```

---

## Resources

- [ERC-4337 Spec](https://eips.ethereum.org/EIPS/eip-4337) — Account Abstraction standard
- [Sonic Docs](https://docs.soniclabs.com) — The chain we're on
- [Pimlico](https://docs.pimlico.io) — Bundler infrastructure
- [Changelog](CHANGELOG.md) — release notes and notable project changes

---

## Contributing

Contributions are welcome. Use GitHub Issues for bugs/features and open PRs with clear test notes.

For sensitive bugs, follow the private disclosure process in [`SECURITY.md`](SECURITY.md).
Contributor workflow details are in [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## License

MIT

---

*Built for games. Invisible to players. Sorted.*
