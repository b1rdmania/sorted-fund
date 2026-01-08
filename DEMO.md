# 🎮 Sorted.fund - Live Demo

See gasless transactions in action on Sonic testnet!

## Quick Start

Make sure the backend is running, then:

```bash
# From the contracts directory
cd contracts

# Run the demo
npx hardhat run scripts/demo.ts --network sonic
```

## What You'll See

The demo will:
1. 📊 Show the current counter value
2. 🔐 Request gas sponsorship from Sorted.fund backend
3. 🔨 Build a UserOperation (no gas needed!)
4. 🚀 Submit to Pimlico bundler
5. ⏳ Wait for on-chain confirmation
6. 🎉 Show the transaction executed WITH ZERO GAS COST

## Example Output

```
======================================================================
🎮  SORTED.FUND - GASLESS TRANSACTION DEMO
======================================================================

What you're about to see:
  • A user makes a blockchain transaction
  • The transaction executes on Sonic testnet
  • The user pays ZERO gas fees
  • Sorted.fund sponsors the entire transaction

⏱️  Starting demo...

📊 Step 1: Checking initial state...
  Counter value: 1
  User balance: 0.01 S
  ✓ Initial state captured

🔐 Step 2: Requesting gas sponsorship...
  ✓ Sponsorship approved!
  Paymaster will cover all gas costs

🔨 Step 3: Building UserOperation...
  ✓ UserOperation ready

🚀 Step 4: Submitting to Pimlico bundler...
  ✓ Submitted! Hash: 0x99a1b9643dc23ff7c5e5b621...
  ⏳ Waiting for on-chain confirmation...

🎉 TRANSACTION SUCCESSFUL!

📈 Step 5: Verifying results...
  Counter: 1 → 2 ✓
  User balance: 0.01 S → 0.01 S
  User paid: 0.0 S (ZERO!)
  Gas used: 203944
  Gas cost: 0.000203944 S (paid by Sorted.fund)

======================================================================
🔗 View on Sonic Explorer:
https://testnet.soniclabs.com/tx/0xef679dfc09206f4c6b8358715ddc519353ce7d5a5b29fa18bf11141bb927cc2c

✨ That's Sorted.fund - Gasless transactions made simple!
======================================================================
```

## Requirements

- Backend running on `http://localhost:3000`
- Contracts deployed on Sonic testnet (already done!)
- Internet connection to access Pimlico bundler

## Share It!

After running the demo, share the transaction link with anyone:
```
https://testnet.soniclabs.com/tx/[your-tx-hash]
```

They can verify on the blockchain explorer that:
- ✅ Transaction executed successfully
- ✅ User's balance didn't change
- ✅ Gas was paid by the paymaster
