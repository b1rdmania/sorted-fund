# Privy-Only + Multi-Tenant Production Implementation Plan

## Why this plan

We already have working sponsorship flows and Privy login. The next step is to remove legacy auth confusion and harden the platform for real customer usage: clear tenant boundaries, auditable fund accounting, and production-grade API ergonomics.

## Goals

- Make Privy the only developer authentication system.
- Enforce tenant isolation through organization-scoped access.
- Track funds with an immutable ledger (not only mutable balances).
- Ship production-ready API key model (env + scopes + rotation).
- Roll out safely with data migration and parity checks.

## Non-goals (for this phase)

- Re-architecting smart contracts.
- Full billing/invoicing UI.
- Multi-chain expansion.

---

## Current state (baseline)

- Privy auth exists (`/auth/me`, `/auth/profile`) and now fronts dashboard access.
- Legacy email/password/session code has been removed from active backend paths.
- Project ownership is developer-centric (`projects.developer_id`) and needs org-level abstraction.
- Gas accounting reserves/releases balances, but ledger-grade auditability is incomplete.

---

## Phase 1 - Auth Consolidation (Privy-only)

### Deliverables

- Single auth surface:
  - `GET /auth/me`
  - `POST /auth/profile`
- All dashboard/backend developer routes use `requirePrivyAuth`.
- Legacy docs/examples cleaned up (no `register/login/logout/session_token`).

### Backend tasks

- Ensure all developer-facing routers rely on Privy middleware only.
- Remove references to legacy auth terms from docs and SDK examples.
- Keep `developers` table as identity profile table (Privy user mapped to internal developer ID).

### Acceptance criteria

- No active route depends on cookie sessions.
- No references to `sorted_session_token` in shipped frontend code.
- E2E flow: login via Privy -> `/auth/me` -> project CRUD works.

---

## Phase 2 - Tenant Model: Organizations + Membership

### Schema additions

- `organizations`
  - `id`, `slug`, `name`, `status`, `created_at`, `updated_at`
- `organization_members`
  - `organization_id`, `developer_id`, `role`, `created_at`
  - unique `(organization_id, developer_id)`
- `projects.organization_id` (required after backfill)

### Role model

- `owner`: full control, billing/funds/admin
- `admin`: manage projects, keys, allowlist, members
- `developer`: build/integrate, view analytics
- `viewer`: read-only analytics/config

### Backend tasks

- Add authorization helpers:
  - `requireOrgMember(orgId)`
  - `requireProjectAccess(projectId, minimumRole)`
- Replace direct `developer_id` ownership checks with org-membership checks.

### Acceptance criteria

- Every project belongs to exactly one organization.
- Every project/API key/allowlist query is org-scoped.
- Role checks enforced on mutating endpoints.

---

## Phase 3 - Funds Ledger and Reconciliation

### Schema additions

- `fund_ledger_entries`
  - `id`, `project_id`, `organization_id`, `type` (`credit|debit|reserve|release|settlement`)
  - `amount`, `asset`, `reference_type`, `reference_id`, `idempotency_key`
  - `metadata_json`, `created_at`
  - unique `(project_id, idempotency_key)`
- `sponsorship_events` additions:
  - `reserved_ledger_entry_id`, `settled_ledger_entry_id`, `released_ledger_entry_id`

### Accounting model

- Authorization: create `reserve` entry.
- Success: convert to `settlement` (actual cost) + release delta.
- Failure/revert: release reserved amount.
- Cached project balance can remain for fast reads, but ledger is source of truth.

### Backend tasks

- Add `ledgerService` with transactional writes.
- Make sponsor authorize/reconcile paths idempotent.
- Add periodic reconciliation job:
  - compare cached balance vs ledger-derived balance
  - emit alerts on drift

### Acceptance criteria

- Any balance can be reconstructed from ledger history.
- Duplicate retries do not double-charge.
- Reconciliation report shows zero unexplained drift.

---

## Phase 4 - API Productization (keys, scopes, versioning)

### API key model

- Keys tied to `project_id` + `environment` (`test|prod`) + `scopes`.
- Suggested scopes:
  - `sponsor:authorize`
  - `sponsor:reconcile`
  - `analytics:read`
  - `allowlist:write`
- Rotation and revocation with auditable timestamps.

### API contract changes

- Introduce `/v1` namespace for stable API.
- Keep current endpoints in compatibility mode temporarily.
- Require idempotency header on mutable endpoints (`Idempotency-Key`).
- Prefer deriving project/env context from key claims where possible.

### Acceptance criteria

- Customer can operate separate test/prod keys safely.
- Breaking changes gated behind `/v1` rollout plan.
- Idempotent retries verified under load.

---

## Phase 5 - Reliability, Security, and Ops

### Deliverables

- Centralized structured logs + request IDs.
- Redis-backed rate limiting and abuse controls.
- Replay protection on sponsorship authorization.
- Alerting:
  - low project balance
  - unusual spending spikes
  - reconciliation failures
- Runbooks for incident response.

### Acceptance criteria

- SLO dashboard exists (latency, error rate, auth failures, sponsor failures).
- On-call can triage from logs/metrics without manual DB spelunking.

---

## Phase 6 - Migration + Rollout Plan

### Migration steps

1. Add new tables/columns in additive migrations.
2. Backfill one default organization per existing developer.
3. Backfill `projects.organization_id` from existing ownership.
4. Backfill opening ledger balances from current project balances.
5. Deploy dual-write for balances + ledger.
6. Validate parity report (old vs ledger balances).
7. Flip read path to ledger-derived balances.
8. Remove deprecated paths/columns after stable period.

### Rollout safeguards

- Feature flags for org auth and ledger reads.
- Shadow-mode validations before cutover.
- Rollback plan: revert reads to cached balances while keeping ledger writes.

### Acceptance criteria

- Zero downtime migration.
- No customer-visible authorization regressions.
- Financial parity confirmed before full cutover.

---

## Endpoint map (target)

- Auth
  - `GET /auth/me`
  - `POST /auth/profile`
- Organizations
  - `GET /v1/orgs`
  - `POST /v1/orgs`
  - `GET /v1/orgs/:orgId/members`
  - `POST /v1/orgs/:orgId/members`
- Projects
  - `GET /v1/projects`
  - `POST /v1/projects`
  - `GET /v1/projects/:projectId`
- API keys
  - `GET /v1/projects/:projectId/apikeys`
  - `POST /v1/projects/:projectId/apikeys`
  - `POST /v1/projects/:projectId/apikeys/:keyId/rotate`
  - `POST /v1/projects/:projectId/apikeys/:keyId/revoke`
- Sponsorship
  - `POST /v1/sponsor/authorize`
  - `POST /v1/sponsor/link`
  - `POST /v1/sponsor/reconcile`
- Ledger/Funds
  - `GET /v1/projects/:projectId/funds/balance`
  - `GET /v1/projects/:projectId/funds/ledger`

---

## Testing strategy

- Unit tests
  - role authorization matrix
  - ledger idempotency
  - reconciliation math
- Integration tests
  - org-scoped access control
  - sponsor authorize/reconcile happy + failure paths
- Migration tests
  - backfill correctness
  - parity report checks
- Load tests
  - authorize endpoint with retry/idempotency behavior

---

## Suggested execution order (2-week sprint)

1. Privy-only cleanup and docs alignment.
2. Organization schema + authz middleware.
3. Ledger schema + dual-write path.
4. `/v1` endpoints + scoped API keys.
5. Migration backfills + parity checks.
6. Cutover and deprecation cleanup.

## Definition of done

- Privy-only auth in production paths.
- Org-scoped authorization across all project resources.
- Ledger-backed, auditable fund accounting.
- Versioned API with scoped keys and idempotent writes.
- Successful migration with verified balance parity.
