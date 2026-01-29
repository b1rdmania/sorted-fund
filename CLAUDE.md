# CLAUDE.md - Sorted.fund Project Context

Last Updated: 2026-01-29

## Current Status

**Production-ready gasless transaction infrastructure** using ERC-4337 Account Abstraction on Sonic testnet.

## Production URLs

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | https://sorted-fund.vercel.app |
| Backend | Render | https://sorted-backend.onrender.com |
| Database | Render | PostgreSQL (auto-connected) |

**Demo Account:** `demo@sorted.fund` / `demo123`

## Local Development

### Prerequisites
```bash
brew services start postgresql@14
```

### Run Services
```bash
# Terminal 1 - Backend (port 3000)
cd backend && npm run dev

# Terminal 2 - Alto Bundler (port 4337) - for local testing only
cd bundler/alto && ./alto --config config.sonic-testnet.json --floor-max-fee-per-gas 2 --floor-max-priority-fee-per-gas 2

# Terminal 3 - Frontend (port 8081)
cd frontend/dashboard-v2 && python3 -m http.server 8081
```

### E2E Test
```bash
cd sdk && npx ts-node test-e2e-alto.ts
```

## Configuration

### Contracts (Sonic Testnet - Chain ID 14601)
| Contract | Address |
|----------|---------|
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| Paymaster | `0x41B35AAD2e3F8c36ad883c354AEa828a2100Bb4a` |
| Test Counter | `0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3` |
| Test Account | `0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506` |

### Network
- **RPC**: https://rpc.testnet.soniclabs.com
- **Explorer**: https://testnet.sonicscan.org

### API Keys (Local Dev)
- **Project ID**: `test-game`
- **API Key**: `sk_sorted_e579aea9ba39f0ba7fd2098d4180ccfcc6ab70810f16dfc8c5d9dcc1f3a22a44`

## Key Files

### Backend
- `backend/src/services/authorizationService.ts` - Signs paymasterAndData
- `backend/src/services/gasReconciliationService.ts` - Gas tracking
- `backend/src/routes/sponsor.ts` - Sponsorship endpoints
- `backend/src/db/schema.sql` - Database schema

### SDK
- `sdk/src/index.ts` - Main SDK client
- `sdk/src/userOpBuilder.ts` - UserOperation builder
- `sdk/test-e2e-alto.ts` - E2E test script

### Frontend
- `frontend/dashboard-v2/` - Dashboard static files
- `frontend/dashboard-v2/assets/js/config.js` - API config (auto-detects prod/dev)

## Transaction Flow

```
User Request → SDK.authorize() → Backend signs paymasterAndData
     ↓
SDK.submitUserOperation() → Bundler → On-chain (gasless!)
     ↓
SDK.waitForUserOp() → Receipt → Backend reconciles actual gas
```

## Architecture

- **Backend**: Express.js API on Render, PostgreSQL database
- **Frontend**: Static HTML/JS on Vercel, calls Render backend
- **Bundler**: Alto (Pimlico's ERC-4337 bundler) - local for dev, hosted for prod
- **Paymaster**: Verifying paymaster that sponsors gas based on backend signature

## Troubleshooting

### Backend won't start
```bash
brew services restart postgresql@14
```

### Frontend API errors
- Hard refresh: Cmd+Shift+R
- Check backend health: `curl https://sorted-backend.onrender.com/health`

### Alto "transaction underpriced"
Use floor flags: `--floor-max-fee-per-gas 2 --floor-max-priority-fee-per-gas 2`

## References

- [ERC-4337 Spec](https://eips.ethereum.org/EIPS/eip-4337)
- [Alto Bundler](https://github.com/pimlicolabs/alto)
- [Sonic Docs](https://docs.soniclabs.com/)
