# Sorted.fund Frontend

Terminal-style web interfaces for demonstrating gasless transactions.

## Two Versions

### 1. `index.html` - Transaction Replay
Shows a replay of a past transaction with step-by-step animation.
- No backend needed
- Just proof-of-concept demonstration
- Links to actual on-chain transaction

### 2. `live.html` - LIVE Execution ⚡
Executes REAL gasless transactions when you click!
- Requires backend running
- Actually submits to blockchain
- Each click = new transaction

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
- Replay demo: http://localhost:8080/index.html
- Live demo: http://localhost:8080/live.html

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

## Styling

Terminal/retro aesthetic inspired by classic command-line interfaces:
- Green-on-black color scheme
- Monospace font
- ASCII borders
- Blinking cursor
- Real-time logs
