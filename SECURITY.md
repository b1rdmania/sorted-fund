# Security Policy

## Reporting a Vulnerability

If you find a security issue, please do **not** open a public issue.

Instead, email details to: `security@sorted.fund`

Please include:

- A clear description of the issue
- Steps to reproduce
- Affected components (API, contracts, dashboard, SDK)
- Impact assessment (funds risk, privilege escalation, data exposure)

We will acknowledge valid reports within 72 hours and work toward a fix timeline based on severity.

## Scope

In scope:

- `backend/` API and auth controls
- `contracts/` paymaster and related on-chain components
- `frontend/` dashboard flows
- deployment/configuration issues that could expose secrets or funds

Out of scope:

- Social engineering
- Denial-of-service without a concrete bypass or exploit path

## Safe Harbor

We support good-faith security research and coordinated disclosure.
