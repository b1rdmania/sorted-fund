# How It Works

Sorted uses ERC-4337 Account Abstraction with a Verifying Paymaster to sponsor gas.

## The flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Your Game  │     │   Sorted    │     │   Bundler   │     │ Blockchain  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │ 1. Request auth   │                   │                   │
       │──────────────────>│                   │                   │
       │                   │                   │                   │
       │                   │ 2. Validate       │                   │
       │                   │    - Check allowlist                  │
       │                   │    - Check balance                    │
       │                   │    - Sign paymaster data              │
       │                   │                   │                   │
       │ 3. Return signed  │                   │                   │
       │<──────────────────│                   │                   │
       │    paymasterData  │                   │                   │
       │                   │                   │                   │
       │ 4. Submit UserOp  │                   │                   │
       │───────────────────────────────────────>                   │
       │                   │                   │                   │
       │                   │                   │ 5. Execute on-chain
       │                   │                   │──────────────────>│
       │                   │                   │                   │
       │                   │                   │ 6. Paymaster pays │
       │                   │                   │<──────────────────│
       │                   │                   │                   │
       │                   │ 7. Reconcile gas  │                   │
       │                   │<──────────────────│                   │
       │                   │                   │                   │
       │ 8. Success        │                   │                   │
       │<──────────────────────────────────────────────────────────│
       │                   │                   │                   │
      User                                                      On-chain
      paid $0                                                   confirmed
```

## Step by step

### 1. Your game requests authorization

When a user triggers an action (mint, transfer, whatever), your backend calls our API with:

- The user's address
- The target contract
- The function selector
- Estimated gas

### 2. We validate the request

We check:

- Is the contract on your allowlist?
- Is the function on your allowlist?
- Does your gas tank have sufficient balance?
- Is the request properly signed?

If all checks pass, we sign `paymasterAndData` with our paymaster's key.

### 3. You get signed paymaster data

We return `paymasterAndData` — a blob that tells the blockchain "Sorted will pay for this."

### 4. You submit the UserOperation

Include our `paymasterAndData` in your ERC-4337 UserOperation and submit it to a bundler.

### 5. The bundler executes on-chain

The bundler batches your UserOp with others and submits to the EntryPoint contract.

### 6. Our paymaster pays the gas

The EntryPoint calls our paymaster contract. It verifies the signature and pays the gas.

The user pays nothing.

### 7. We reconcile actual gas used

After the transaction confirms, we deduct the actual gas cost from your gas tank.

### 8. Done

Transaction confirmed. User didn't touch their wallet.

## Key concepts

### ERC-4337 Account Abstraction

A standard for "smart contract wallets" that separates who signs a transaction from who pays for it.

[Read the spec →](https://eips.ethereum.org/EIPS/eip-4337)

### Verifying Paymaster

A smart contract that agrees to pay gas for specific transactions. Ours checks:

- The request was signed by Sorted
- The target contract is allowlisted
- The policy hash matches

### UserOperation

The ERC-4337 equivalent of a transaction. Contains the call data plus metadata about gas limits and paymaster.

### Bundler

A service that collects UserOperations and submits them to the blockchain. We use [Alto](https://github.com/pimlicolabs/alto).

## Security

- **Allowlists** — Only your approved contracts can be sponsored
- **Spending limits** — Set daily caps to control costs
- **Signed requests** — Every authorization is cryptographically signed
- **No private keys** — We never touch your users' keys
