# Sorted.fund Frontend

Terminal-style web interfaces for demonstrating gasless transactions.

## Three Versions

### 1. `demo.html` - **RECOMMENDED** Full Value Prop Demo 🌟
Shows the complete business value of Sorted.fund with two-panel view.
- **Left side (Developer):** Gas station balance, integration code, metrics
- **Right side (User):** Multiple use cases (game actions, social posts)
- Shows how developers fund once, users pay zero forever
- Live metrics showing gas saved and transactions sponsored
- Best for showing to stakeholders, investors, potential users

### 2. `live.html` - Technical Live Execution ⚡
Executes REAL gasless transactions when you click!
- Requires backend running
- Actually submits to blockchain
- Each click = new transaction
- Built-in nonce collision protection
- 10-second cooldown between transactions
- Diagnostic "Check Nonce" button for troubleshooting
- Best for developers who want to see the technical details

### 3. `index.html` - Transaction Replay
Shows a replay of a past transaction with step-by-step animation.
- No backend needed
- Just proof-of-concept demonstration
- Links to actual on-chain transaction
- Best for quick offline demos

## Quick Start

**Start the server:**
```bash
# Python 3
python3 -m http.server 8080

# Or use the helper script from root:
cd ..
./start-frontend.sh
```

**Then open:**
- 🌟 **Value prop demo (RECOMMENDED):** http://localhost:8080/demo.html
- 🔧 Technical live demo: http://localhost:8080/live.html
- 📺 Replay demo: http://localhost:8080/index.html

## Requirements

- Backend running on `http://localhost:3000`
- Contracts deployed on Sonic testnet

## What It Shows

- Current counter value (live from blockchain)
- User balance (live from blockchain)
- Terminal-style transaction logs
- Demo of gasless transaction flow

## Note

This is a **demo interface** showing the concept. The "Execute" button shows what would happen but links to the actual transaction that was executed.

For **real live execution**, use:
```bash
cd ../contracts
npx hardhat run scripts/demo.ts --network sonic
```

## Troubleshooting

### AA25 Nonce Collision Error

If you get an "AA25 invalid account nonce" error:

1. **Wait 60 seconds** for the pending transaction to complete
2. **Refresh the page** to clear any cached state
3. **Use the "Check Nonce" button** to verify the current nonce
4. **Try again**

The live frontend includes:
- 3-second propagation delay before submission
- 10-second cooldown between transactions
- Automatic nonce verification

If the error persists, check the nonce manually:
```bash
cd contracts
npx hardhat run scripts/check-nonce.ts --network sonic
```

### AA33 MaxCostExceeded Error

This means gas estimation was too low. This should be rare with the current 600k gas estimate. If you encounter this, please report it.

## Styling

Terminal/retro aesthetic inspired by classic command-line interfaces:
- Green-on-black color scheme
- Monospace font
- ASCII borders
- Blinking cursor
- Real-time logs
