# CLAUDE.md - Sorted.fund Project Context

Last Updated: 2026-02-01

## Status: Privy Auth Integrated, Projects Need Work

**What works:**
- Live gasless transactions on Sonic testnet
- Demo page at sorted.fund/demo.html (one click, real tx)
- Privy authentication at sorted.fund/login/ (wallet + email + Google)
- Documentation at sorted.fund/docs/ (VitePress)
- Backend API on Render
- ERC-4337 paymaster + bundler integration

**What needs work:**
- Project creation → user association needs testing
- Deposits → need to allocate to correct user/project
- Dashboard → verify it works with Privy auth end-to-end
- Self-service deposits not implemented yet

## Recent Changes (2026-02-01)

**Privy auth integration:**
- New login app at `/login/` using React + Privy SDK
- Backend: `@privy-io/server-auth` for token verification
- New `/auth/privy/me` endpoint, `privyAuth.ts` middleware
- Database: added `privy_user_id` column to developers table
- Frontend `auth.js` updated to use Privy tokens
- Old `login.html` removed

**Docs cleanup:**
- Applied Orwell language rules
- VitePress docs build on Vercel deploy
- Added docs link to main nav

## Live URLs

| Service | URL |
|---------|-----|
| **Production Site** | https://sorted.fund |
| **Login (Privy)** | https://sorted.fund/login/ |
| **Documentation** | https://sorted.fund/docs/ |
| **Live Demo** | https://sorted.fund/demo.html |
| **Dashboard** | https://sorted.fund/dashboard.html |
| **Backend API** | https://sorted-backend.onrender.com |
| **GitHub** | https://github.com/b1rdmania/sorted-fund |

## Next Steps (Priority Order)

1. **Project Setup Flow** - Test creating projects with Privy-authenticated users
2. **Deposit Allocation** - Ensure deposits go to correct user/project
3. **Dashboard Testing** - Verify full flow: login → create project → get API key → see analytics
4. **User Testing** - Get real developers trying the flow
5. **Self-service Deposits** - Let devs fund gas tanks directly
6. **Mainnet Deployment** - Graduate from Sonic testnet

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Static HTML/JS + React login app on Vercel |
| Backend | Express + TypeScript + PostgreSQL on Render |
| Auth | Privy (wallet + email + social) |
| Blockchain | Sonic Testnet (Chain 14601) |
| AA | ERC-4337 v0.7 with Verifying Paymaster |
| Bundler | Alto (local dev only) |

## Contracts (Sonic Testnet)

| Contract | Address |
|----------|---------|
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| Paymaster | `0x41B35AAD2e3F8c36ad883c354AEa828a2100Bb4a` |
| Test Counter | `0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3` |

## Privy Configuration

**App ID:** `cml40ylts00dpk20ccec1902m`

**Render env vars (already set):**
- `PRIVY_APP_ID`
- `PRIVY_APP_SECRET`

**Login methods enabled:** email, wallet (MetaMask etc), Google

**Login app location:** `frontend/dashboard-v2/login-app/` (React, builds to `/login/`)

## Deployment

```bash
# Frontend (Vercel) - builds docs + login app
vercel --prod

# Backend (Render) - trigger redeploy
curl https://api.render.com/deploy/srv-d5l83963jp1c73956ml0?key=p_Ch7HGhnZA

# Run migrations (after backend deploy)
curl -X POST https://sorted-backend.onrender.com/admin/migrate
```

## Local Development

```bash
# Backend (port 3000)
cd backend && npm run dev

# Frontend (port 8081)
cd frontend/dashboard-v2 && python3 -m http.server 8081

# Login app dev (port 5173)
cd frontend/dashboard-v2/login-app && npm run dev

# Bundler (port 4337) - only for local E2E
cd bundler/alto && ./alto --config config.sonic-testnet.json --floor-max-fee-per-gas 2 --floor-max-priority-fee-per-gas 2
```

## Project Structure

```
├── backend/           # Express API (Render)
├── docs/              # VitePress docs (builds to frontend/dashboard-v2/docs/)
├── frontend/
│   └── dashboard-v2/  # Static site (Vercel) ← sorted.fund
│       └── login-app/ # React Privy login (builds to /login/)
├── sdk/               # TypeScript SDK (planned, not built)
├── contracts/         # Solidity (deployed)
├── bundler/alto/      # ERC-4337 bundler (submodule)
├── sorted-brand-kit/  # Brand guidelines, logos, design system
├── render.yaml        # Render config
└── vercel.json        # Vercel config (runs docs + login builds)
```

## Key Files

- `backend/src/routes/privyAuth.ts` - Privy auth endpoints
- `backend/src/middleware/privyAuth.ts` - Privy token verification
- `backend/src/services/privyService.ts` - Privy client + developer management
- `backend/src/routes/demo.ts` - Demo endpoint (executes real tx)
- `frontend/dashboard-v2/login-app/` - React Privy login
- `frontend/dashboard-v2/assets/js/auth.js` - Frontend auth utility (updated for Privy)

## Design Ethos

**Visual:** "Utility Sublime" - warm infrastructure aesthetic. Functional green (#22c55e) on dark backgrounds. Inter + JetBrains Mono. Dense, information-rich layouts.

**Technical:** KISS - static HTML where possible, React only for Privy login. Express, PostgreSQL. Boring and reliable.

**Product:** Developer-first. One API call to sponsor gas. Players never see blockchain.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Login redirect loop | Clear localStorage, try sorted.fund/login/ |
| Demo fails with NetworkError | Check CORS - is origin in ALLOWED_ORIGINS? |
| Backend sleeping | First request takes ~30s (Render free tier) |
| Frontend stale | Hard refresh: Cmd+Shift+R |
| Privy modal not appearing | Check browser console, verify PRIVY_APP_ID |
