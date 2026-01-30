# CLAUDE.md - Sorted.fund Project Context

Last Updated: 2026-01-29

## Status: Production Ready

Everything works end-to-end:
- ✅ Frontend dashboard (Vercel)
- ✅ Backend API (Render)
- ✅ User signup/login
- ✅ Gasless transaction flow
- ✅ Gas reconciliation

## What Is This?

**Sorted.fund** is a gasless transaction infrastructure for Web3 games. It lets game developers sponsor gas fees so players never need tokens to play.

**Tech stack:** ERC-4337 Account Abstraction on Sonic testnet with a verifying paymaster.

**GitHub:** https://github.com/b1rdmania/sorted-fund

## Production

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | https://sorted-fund.vercel.app |
| Backend | Render | https://sorted-backend.onrender.com |
| Database | Render PostgreSQL | (auto-connected to backend) |

**Demo login:** `demo@sorted.fund` / `demo123`

## Deployment

**Frontend (Vercel):** Auto-deploys on push to master. Config in `vercel.json`.

**Backend (Render):** Auto-deploys on push to master. Config in `render.yaml`.

Manual deploy:
```bash
# Frontend
vercel --prod

# Backend (trigger webhook)
curl https://api.render.com/deploy/srv-d5l83963jp1c73956ml0?key=p_Ch7HGhnZA
```

## Local Development

```bash
# Prerequisites
brew services start postgresql@14

# Backend (port 3000)
cd backend && npm run dev

# Frontend (port 8081)
cd frontend/dashboard-v2 && python3 -m http.server 8081

# Alto Bundler (port 4337) - only for local E2E testing
cd bundler/alto && ./alto --config config.sonic-testnet.json --floor-max-fee-per-gas 2 --floor-max-priority-fee-per-gas 2

# E2E test
cd sdk && npx ts-node test-e2e-alto.ts
```

## Contracts (Sonic Testnet - Chain 14601)

| Contract | Address |
|----------|---------|
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| Paymaster | `0x41B35AAD2e3F8c36ad883c354AEa828a2100Bb4a` |
| Test Counter | `0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3` |
| Test Account | `0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506` |

**RPC:** https://rpc.testnet.soniclabs.com
**Explorer:** https://testnet.sonicscan.org

## Project Structure

```
├── backend/           # Express.js API (Render)
│   └── src/
│       ├── routes/    # API endpoints
│       ├── services/  # Business logic (authorization, gas reconciliation)
│       └── db/        # PostgreSQL schema & queries
├── frontend/
│   └── dashboard-v2/  # Static dashboard (Vercel)
├── sdk/               # TypeScript SDK for game integration
├── contracts/         # Solidity contracts (already deployed)
├── bundler/alto/      # ERC-4337 bundler (git submodule, local dev only)
├── vercel.json        # Vercel deployment config
└── render.yaml        # Render deployment config
```

## Key Files

- `backend/src/services/authorizationService.ts` - Signs paymasterAndData
- `backend/src/routes/sponsor.ts` - `/sponsor/authorize` endpoint
- `frontend/dashboard-v2/assets/js/config.js` - Auto-detects prod vs local
- `sdk/src/index.ts` - SortedClient for game integration

## How It Works

```
Game calls SDK.authorize(userOp)
    → Backend validates & signs paymasterAndData
    → SDK submits to bundler
    → Bundler executes on-chain (user pays $0)
    → Backend reconciles actual gas used
```

## API Keys (Local Dev Only)

- **Project ID:** `test-game`
- **API Key:** `sk_sorted_e579aea9ba39f0ba7fd2098d4180ccfcc6ab70810f16dfc8c5d9dcc1f3a22a44`

## Quick Checks

```bash
# Backend health
curl https://sorted-backend.onrender.com/health

# Test login
curl -X POST https://sorted-backend.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@sorted.fund","password":"demo123"}'
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Backend won't start locally | `brew services restart postgresql@14` |
| Frontend stale | Hard refresh: Cmd+Shift+R |
| Render backend sleeping | First request takes ~30s to wake |
| Alto "underpriced" error | Use `--floor-max-fee-per-gas 2` flags |

## Design Ethos

**Visual:** Terminal/hacker aesthetic (green on black, monospace). Signals "built by devs, for devs."

**Technical:** KISS - static HTML frontend, Express backend, PostgreSQL. No fancy frameworks. Boring and reliable.

**Product:** Developer-first. Get API key → integrate SDK → working in under an hour. Players never see blockchain.
