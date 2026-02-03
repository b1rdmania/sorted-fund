# Deployment Checklist (Lean Multi-Chain Ready)

## Goal

Ship a stable production deployment with Privy auth, org/project separation, chain-aware sponsorship accounting, and per-chain funding addresses.

## Pre-deploy

- [ ] Confirm backend env vars are set:
  - `DATABASE_URL`
  - `BACKEND_SIGNER_PRIVATE_KEY`
  - `PRIVY_APP_ID`, `PRIVY_APP_SECRET`
  - `API_KEY_SALT`
  - `SONIC_RPC_URL`, `SONIC_CHAIN_ID`
  - `PAYMASTER_ADDRESS` (and optional `PAYMASTER_ADDRESS_<CHAIN_ID>`)
- [ ] Confirm database is backed up.
- [ ] Confirm migration runner access to production DB.

## Database

- [ ] Run migrations in order (`001` to latest).
- [ ] Verify chain registry seed exists (`chain_id=14601`).
- [ ] Verify project funding account backfill completed.
- [ ] Run parity audit:
  - `npm run audit:parity`
  - must report `outOfSyncProjects: 0` before cutover.

## Backend verification

- [ ] Build succeeds: `npm run build`.
- [ ] Smoke test passes: `npm run test:smoke`.
- [ ] Runtime health check passes: `GET /health`.
- [ ] Chain endpoint passes: `GET /blockchain/chains`.
- [ ] Admin drift check passes: `GET /admin/funds-parity` (with admin token).

## Product path checks

- [ ] Privy login works (`/auth/me`).
- [ ] Developer can list projects and create project.
- [ ] Developer can fetch funding accounts:
  - `GET /projects/:id/funding-accounts`
  - `GET /projects/:id/funding-accounts/:chainId`
- [ ] Sponsor flow works on Sonic testnet:
  - authorize -> link -> reconcile.

## Demo safety

- [ ] Demo route still responds:
  - `GET /demo/status`
  - `POST /demo/execute` (when demo wallet is configured/funded).

## Post-deploy monitoring

- [ ] Track 4xx/5xx error rates on `/sponsor/*`.
- [ ] Watch parity drift (`/admin/funds-parity`) at regular interval.
- [ ] Alert on out-of-sync projects > 0.

## Explicitly out of scope for this deployment

- Grant spend allocation logic in runtime authorization.
- Non-EVM chains.
- Full billing/invoicing product workflows.

