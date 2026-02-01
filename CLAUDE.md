# CLAUDE.md - Sorted.fund Project Context

Last Updated: 2026-02-01

## Status: Live Demo Working, Docs Live, Auth Needs Rebuild

**What works:**
- Live gasless transactions on Sonic testnet
- Demo page at sorted.fund/demo.html (one click, real tx)
- Dashboard preview at sorted.fund/demo-dashboard.html
- Documentation at sorted.fund/docs/ (VitePress)
- Backend API on Render
- ERC-4337 paymaster + bundler integration

**What needs work:**
- Auth system is buggy (custom-built) → Replace with Privy
- Project creation has edge cases → Needs proper user/project database
- No self-service deposits yet

## Recent Changes (2026-02-01)

**Docs cleanup & deployment:**
- Applied Orwell language rules: removed time estimates, vague promises, marketing fluff
- Honest beta language: "Testnet" badge, "planned" SDK (not "coming soon"), pricing TBD
- VitePress docs now build on Vercel deploy → sorted.fund/docs/
- Added docs link to main site nav (bottom, with spacing)

## Live URLs

| Service | URL |
|---------|-----|
| **Production Site** | https://sorted.fund |
| **Documentation** | https://sorted.fund/docs/ |
| **Live Demo** | https://sorted.fund/demo.html |
| **Dashboard Preview** | https://sorted.fund/demo-dashboard.html |
| **Backend API** | https://sorted-backend.onrender.com |
| **GitHub** | https://github.com/b1rdmania/sorted-fund |

**Demo login:** `demo@sorted.fund` / `demo123` (buggy - Privy will replace)

## Next Steps (Priority Order)

1. **Privy Integration** - Replace buggy custom auth with Privy (wallet + social login). This unblocks real user testing.
2. **Database Hardening** - Fix user → project → API key relationships. Current project creation has edge cases.
3. **User Testing** - Get real developers trying the flow end-to-end
4. **Self-service Deposits** - Let devs fund gas tanks directly (currently manual)
5. **Mainnet Deployment** - Graduate from Sonic testnet

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Static HTML/JS on Vercel |
| Backend | Express + TypeScript + PostgreSQL on Render |
| Auth | Custom (to be replaced with Privy) |
| Blockchain | Sonic Testnet (Chain 14601) |
| AA | ERC-4337 v0.7 with Verifying Paymaster |
| Bundler | Alto (local dev only) |

## Contracts (Sonic Testnet)

| Contract | Address |
|----------|---------|
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| Paymaster | `0x41B35AAD2e3F8c36ad883c354AEa828a2100Bb4a` |
| Test Counter | `0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3` |

## Deployment

```bash
# Frontend (Vercel)
vercel --prod

# Backend (Render) - trigger redeploy
curl https://api.render.com/deploy/srv-d5l83963jp1c73956ml0?key=p_Ch7HGhnZA

# Update Render env vars (if needed)
render services  # CLI is installed and authenticated
```

## Local Development

```bash
# Backend (port 3000)
cd backend && npm run dev

# Frontend (port 8081)
cd frontend/dashboard-v2 && python3 -m http.server 8081

# Bundler (port 4337) - only for local E2E
cd bundler/alto && ./alto --config config.sonic-testnet.json --floor-max-fee-per-gas 2 --floor-max-priority-fee-per-gas 2
```

## Project Structure

```
├── backend/           # Express API (Render)
├── docs/              # VitePress docs (builds to frontend/dashboard-v2/docs/)
├── frontend/
│   └── dashboard-v2/  # Static site (Vercel) ← sorted.fund
├── sdk/               # TypeScript SDK (planned, not built)
├── contracts/         # Solidity (deployed)
├── bundler/alto/      # ERC-4337 bundler (submodule)
├── sorted-brand-kit/  # Brand guidelines, logos, design system
├── render.yaml        # Render config
└── vercel.json        # Vercel config (runs docs build)
```

## Key Files

- `backend/src/routes/demo.ts` - Demo endpoint (executes real tx)
- `backend/src/services/authorizationService.ts` - Signs paymasterAndData
- `frontend/dashboard-v2/demo.html` - Live demo page
- `frontend/dashboard-v2/demo-dashboard.html` - Static preview dashboard
- `docs/` - VitePress documentation source
- `sorted-brand-kit/sorted-design-guidelines.md` - Design system (Orwell language rules apply)

## Design Ethos

**Visual:** "Utility Sublime" - warm infrastructure aesthetic. Functional green (#22c55e) on dark backgrounds. Inter + JetBrains Mono. Dense, information-rich layouts.

**Technical:** KISS - static HTML, Express, PostgreSQL. No frameworks. Boring and reliable.

**Product:** Developer-first. One API call to sponsor gas. Players never see blockchain.

## CORS

Backend CORS allowlist (in Render env vars):
```
https://sorted.fund,https://www.sorted.fund,https://sorted-fund.vercel.app,https://*.vercel.app,http://localhost:8081
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Demo fails with NetworkError | Check CORS - is origin in ALLOWED_ORIGINS? |
| Backend sleeping | First request takes ~30s (Render free tier) |
| Login not working | Known issue - auth is buggy, Privy will fix |
| Frontend stale | Hard refresh: Cmd+Shift+R |
