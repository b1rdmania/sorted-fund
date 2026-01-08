# Sorted.fund Frontend

Terminal-style web interface for demonstrating gasless transactions.

## Quick Start

**Option 1: Simple HTTP Server**
```bash
# Python 3
python3 -m http.server 8080

# Or Node.js
npx http-server -p 8080
```

Then open: http://localhost:8080

**Option 2: Open Directly**
Just open `index.html` in your browser (CORS may block backend calls)

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
