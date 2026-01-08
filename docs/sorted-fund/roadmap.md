# Implementation Roadmap

## Sprint Plan

1. **Sprint 0 (week 0)** – Document the vision. Completed foundation docs: `overview.md`, `architecture.md`, `backend-spec.md`, `roadmap.md`.
2. **Sprint 1 (week 1-2)** – Build the verifying paymaster & backend scaffolding:
   * Deploy paymaster to Sonic testnet with EntryPoint v0.7 locked.
   * Implement backend API key + project model, `/sponsor/authorize`, gas tank accounting, policy engine.
   * Sketch SDK helper for API key authentication and bundler submission via Pimlico `eth_sendUserOperation`.
3. **Sprint 2 (week 3)** – Harden controls & observability:
   * Add usage metering, logging, daily caps.
   * Build kill switches (global/project/chain) with backend toggles and paymaster gating.
   * Surface mismatches between estimated vs actual gas usage.
4. **Sprint 3 (week 4-5)** – Demo & validation:
   * Integrate a sample game/app that funds a gas tank and calls `sendSponsoredTx()`.
   * Run end-to-end sponsored transactions through Pimlico to Sonic EntryPoint + paymaster.
   * Gather logs/traces validating no unauthorized paths and that DevRel setup takes <15 minutes.
5. **Post-MVP (week 6+)** – Operational readiness:
   * Document upgrade path (mainnet, multi-project, EIP-7702 auto-mode).
   * Plan RPC provider selection, paymaster key rotation, and multi-chain policy configuration.
   * Run penetration/load tests and practice kill switch playbooks.

## Success Criteria

* Technical: Reliable gasless transactions on Sonic testnet, paymaster rejects unauthorized selectors, logs capture every sponsored tx.
* Developer: Setup in <15 minutes, no ERC-4337 concepts surfaced, SDK APIs consistent, error messages actionable.
* Strategic: Sonic DevRel can point to the demo, path to mainnet + additional chains is documented, Phase 2/3 triggers are defined.

## Open Questions

* Sonic mainnet paymaster constraints—are there extra verifiers or fee mechanics we need to satisfy beyond standard EntryPoint v0.7?
* Preferred RPC providers for Sonic (public nodes vs dedicated RPC + guardrails for replay/DoS).
* Appetite for chain-funded gas credits or fee monetization (per Sonic FeeM program) once we expand beyond testnet.
* Timeline for EIP-7702 tooling support or auto-mode (4337 vs 7702) once Sorted.fund has a stable base.

## Next Steps

* Align with DevRel to confirm Sonic testnet availability & Pimlico bundler keys.
* Finalize SDK ergonomics for `sendSponsoredTx()` (error normalization, bundler retries).
* Start Sprint 1 implementation once paymaster contract template and backend schema are reviewed.

