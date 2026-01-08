# Architecture & Lifecycle

## What is Sorted.fund?

Sorted.fund is a gasless transaction infrastructure for Sonic testnet. It allows developers to sponsor gas fees for their users, enabling true zero-friction onboarding—no wallets, no tokens, no gas fees required.

**For Developers:**
1. Create a project on the Sorted dashboard
2. Fund your gas tank by sending S tokens to your unique deposit address
3. Add one line of code to your app: `import { SortedClient } from '@sorted/sdk'`
4. Your users can now interact with your smart contracts without paying gas

**For End Users:**
- Click buttons, mint NFTs, play games—all with zero balance
- No crypto wallet setup, no buying tokens, no transaction fees
- Instant, seamless blockchain interactions that feel like Web2

**The Stack:**
The Sorted.fund stack keeps the sponsored transaction path predictable: SDK → backend control plane → Pimlico bundler → Sonic EntryPoint → Sorted paymaster → target contract. Every sponsored call includes a backend-signed `paymasterAndData` that encodes the scope of what the paymaster is allowed to fund.

## Complete System Architecture

```mermaid
flowchart TB
  subgraph "End Users (Players/App Users)"
    user[User with Zero Balance]
  end

  subgraph "Developer's Application"
    app[Game/DApp Frontend]
    sdk[Sorted SDK]
  end

  subgraph "Developer Management"
    dev[Developer]
    dashboard[Sorted Dashboard]
    deposit[HD Wallet Deposit Address]
  end

  subgraph "Sorted Backend"
    api[Control Plane API]
    gastank[Gas Tank Balance]
    allowlist[Allowlist Manager]
    analytics[Usage Analytics]
  end

  subgraph "On-Chain Infrastructure"
    bundler[Pimlico Bundler]
    entrypoint[EntryPoint v0.7<br/>0x0000...da032]
    paymaster[Sorted Verifying Paymaster<br/>0x41B3...Bb4a]
    target[Target Contracts]
  end

  %% User flow
  user -->|interact with| app
  app -->|calls| sdk

  %% Developer setup flow
  dev -->|manages project| dashboard
  dashboard -->|creates/monitors| api
  dev -->|sends S tokens| deposit
  deposit -->|credits| gastank
  dashboard -->|configures| allowlist
  dashboard -->|views| analytics

  %% Transaction flow
  sdk -->|1. request auth| api
  api -->|2. check allowlist & balance| allowlist
  api -->|3. sign paymasterAndData| paymaster
  api -->|4. return signature| sdk
  sdk -->|5. submit UserOp| bundler
  bundler -->|6. relay to chain| entrypoint
  entrypoint -->|7. validate & call| paymaster
  paymaster -->|8. verify & sponsor| target
  target -->|9. execute & emit events| entrypoint
  entrypoint -->|10. return receipt| bundler
  bundler -->|11. tx hash| sdk
  sdk -->|12. success| app
  app -->|13. updated state| user

  %% Analytics loop
  api -->|log request| analytics
  paymaster -->|report gas used| analytics
  analytics -->|deduct from| gastank

  style user fill:#e1f5ff
  style dev fill:#ffe1e1
  style gastank fill:#d4edda
  style paymaster fill:#fff3cd
```

## Full Sponsored Transaction Lifecycle

```mermaid
sequenceDiagram
  participant User as End User<br/>(0 balance)
  participant App as Game/DApp
  participant SDK as Sorted SDK
  participant Backend as Control Plane
  participant Bundler as Pimlico
  participant Chain as Sonic Testnet
  participant Paymaster as Sorted Paymaster
  participant Contract as Target Contract

  User->>App: Click "Mint NFT" button
  App->>SDK: mintNFT(tokenId)
  SDK->>Backend: POST /sponsor/authorize<br/>{user, target, selector, estimatedGas}
  Backend->>Backend: Check allowlist
  Backend->>Backend: Check gas tank balance
  Backend->>Backend: Check daily cap
  Backend->>Backend: Sign paymasterAndData
  Backend-->>SDK: {paymasterAndData, expiresAt, maxCost}
  SDK->>Bundler: eth_sendUserOperation
  Bundler->>Chain: Submit to mempool
  Chain->>Paymaster: validatePaymasterUserOp()
  Paymaster->>Paymaster: Verify signature
  Paymaster->>Paymaster: Check allowlist
  Paymaster-->>Chain: Valid, will sponsor
  Chain->>Contract: execute(mintNFT)
  Contract-->>Chain: NFT minted
  Chain-->>Bundler: Receipt + gas used
  Bundler-->>SDK: UserOp hash
  SDK-->>App: Transaction confirmed
  App-->>User: NFT minted (paid $0)

  Paymaster->>Backend: Report gas usage (webhook/poll)
  Backend->>Backend: Deduct from gas tank
  Backend->>Backend: Update analytics
```

## Developer Funding Workflow

```mermaid
flowchart LR
  subgraph "Developer Actions"
    dev[Developer]
    wallet[MetaMask/Wallet]
  end

  subgraph "Sorted Infrastructure"
    dashboard[Dashboard]
    deposit[HD Wallet Address<br/>BIP-44: 44'/60'/0'/0/n]
    backend[Backend API]
    gastank[Gas Tank Balance]
  end

  subgraph "On-Chain"
    chain[Sonic Testnet]
    paymaster[Paymaster Contract]
  end

  dev -->|1. Login to| dashboard
  dashboard -->|2. Show unique| deposit
  dev -->|3. Copy address| deposit
  dev -->|4. Send S tokens| wallet
  wallet -->|5. Transfer on-chain| chain
  chain -->|6. Arrives at| deposit
  deposit -->|7. Auto-forward| paymaster
  paymaster -->|8. Notify| backend
  backend -->|9. Credit| gastank
  gastank -->|10. Update| dashboard
  dashboard -->|11. Show balance| dev

  style deposit fill:#fff3cd
  style gastank fill:#d4edda
```

**Funding Flow Details:**
1. Each project gets a unique HD wallet-derived deposit address (BIP-44 path: `44'/60'/0'/0/{projectIndex}`)
2. Developer sends S tokens to their project's deposit address
3. Backend detects deposit via Alchemy webhooks + backup poller
4. Funds automatically forwarded to paymaster contract
5. Gas tank balance credited in database
6. Dashboard shows updated balance in real-time

## Component Responsibilities

* **End Users** interact with games/dApps without needing crypto wallets or gas tokens. Transactions appear instant and free.
* **Developers** integrate Sorted SDK into their apps, manage allowlists via dashboard, and fund their gas tank by sending S tokens to their unique deposit address.
* **Sorted Dashboard** provides project management, API key generation, allowlist configuration, analytics viewing, and gas tank balance monitoring.
* **HD Wallet Deposit Addresses** are deterministically generated per-project using BIP-44 standard (path: `44'/60'/0'/0/{index}`). One master mnemonic derives all project addresses.
* **Sorted SDK** handles API key authentication, calls `/sponsor/authorize`, auto-retries transient errors, and normalizes Pimlico `eth_sendUserOperation` responses.
* **Backend Control Plane** manages projects, API keys, gas tanks, allowlists, caps, and kill switches. It emits paymaster authorization payloads (signature + policy hash + expiry + max cost) consumed by the on-chain paymaster.
* **Pimlico Bundler** is our hosted relayer. It accepts `eth_sendUserOperation`, `eth_estimateUserOperationGas`, and status queries using a Pimlico API key created via their CLI/dashboard workflow.
* **EntryPoint v0.7** (Sonic testnet) is the canonical verifier. Its address `0x0000000071727de22e5e9d8baf0edac6f37da032` is hard-coded into the paymaster.
* **Sorted Verifying Paymaster** enforces EntryPoint-only calls, allowlists (target + selector), max gas/cost per UserOp, backend signature validity, and kill switches (global/project/chain).

## Observability Loop

Every sponsored flow logs:

1. Authorization request (selector, estimated gas, project state).
2. `paymasterAndData` issuance (policy hash, expiry, signature).
3. Bundler submission result (hash, status).
4. EntryPoint/paymaster reconciliation (actual gas, refund, failure reason).

This timeline provides the audit trail required by DevRel and ensures we can detect unauthorized or over-budget execution paths quickly.

