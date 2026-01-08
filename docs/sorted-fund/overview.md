# Sorted.fund Overview

Sorted.fund is a **gasless execution and sponsorship control layer** built on top of ERC-4337 Account Abstraction. It wraps bundlers, paymasters, and EntryPoint mechanics in one opinionated control plane so indie developers, games, and hackathon teams can offer gasless UX without studying AA theory or bundler ops.

## Core Thesis

* Developers fund a shared gas tank.
* Applications call a single backend API (`/sponsor/authorize`).
* Signed UserOperations flow through our hosted bundler (Pimlico) to Sonic testnet EntryPoint v0.7.
* The Sorted paymaster validates every step, keeping gas sponsorship safe and bounded.

Sorted.fund keeps the integration surface minimal—no AA primitives, no wallet infra, no policy DSL. Instead we provide conservative defaults, allowlists, and canaries so users "never think about gas again."

## Why Sonic?

We validate on Sonic testnet because it already exposes a deployed EntryPoint v0.7, has predictable gas (base fee ≈ 50 GWei, tips at 1 wei), and developer relations support for gasless demos. Sonic’s docs on [account abstraction](https://docs.soniclabs.com/technology/pectra-compatibility/account-abstraction), [alternative fee payments](https://docs.soniclabs.com/technology/pectra-compatibility/alternative-fee-payments), and [gas pricing](https://docs.soniclabs.com/sonic/build-on-sonic/gas-pricing) give us the guardrails for bundler behavior, paymaster requirements, and fee estimation.

## MVP Focus

* **Included**: ERC-4337 v0.7 only, Sonic testnet, Pimlico bundler, our verifying paymaster, one off-chain API, one demo app integration.
* **Excluded (v1)**: Multi-chain, ERC-20 gas payments, session keys, wallet infra, complex policy DSLs, EIP-7702 support.

## Safety Principles

1. **Backend-signed `paymasterAndData`**—stateless payload includes expiry, max cost, policy hash, and selector scope.
2. **Paymaster enforceables**—EntryPoint-only caller, allowlisted target contracts/selectors, max gas/cost per UserOp, and kill switches baked in.
3. **Centralized control plane**—projects, API keys, gas tanks, rate limits, and usage logging; sealing sponsorship decisions before any OnChain action.

## Developer Experience

1. Fund a gas tank (our backend tracks balances + caps).
2. Get an API key (easy CLI/dashboard onboarding).
3. Call `sendSponsoredTx()` (SDK performs `/sponsor/authorize`, attaches signed payload to UserOperation, and hits Pimlico `eth_sendUserOperation`).

Success is a setup that takes under 15 minutes, surfaces clear failure messages, and lets DevRel point builders to a zero-friction onboarding path.

