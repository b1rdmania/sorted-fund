# Sorted.fund

Gasless transaction sponsorship layer built on ERC-4337 Account Abstraction for Sonic testnet.

## Project Status

✅ **Phase 1 Complete** - Foundation & Environment Setup
✅ **Phase 2 Complete** - Smart Contract Development & Deployment
✅ **Phase 3 Complete** - Developer Dashboard & Live Demo

**Current Status**: Production-ready gasless transaction system on Sonic testnet with self-service developer dashboard.

## Repository Structure

```
sorted/
├── backend/          # Control plane API (Express + TypeScript + PostgreSQL)
├── contracts/        # Smart contracts (Hardhat + Solidity)
├── sdk/             # TypeScript SDK for developers
├── frontend/         # Developer dashboard (Vanilla JS)
│   └── dashboard-v2/ # Terminal-aesthetic UI
├── demo/            # Demo application (Phase 6)
└── docs/            # Documentation
    └── sorted-fund/
        ├── overview.md              # Project overview
        ├── architecture.md          # System architecture
        ├── backend-spec.md          # Backend API specification
        ├── roadmap.md              # Development roadmap
        ├── implementation-plan.md   # Detailed implementation plan
        └── sonic-testnet-config.md  # Sonic testnet configuration
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (for backend database)
- Git
- Sonic testnet tokens (from faucet)
- Pimlico API key (for bundler integration)

### Setup

1. **Clone and install dependencies:**
   ```bash
   # Backend
   cd backend
   npm install

   # Contracts
   cd ../contracts
   npm install

   # SDK
   cd ../sdk
   npm install
   ```

2. **Set up PostgreSQL database:**
   ```bash
   # Create database
   createdb sorted_fund

   # Create user (optional)
   psql -c "CREATE USER postgres WITH PASSWORD 'sortedtest';"

   # Run schema
   cd backend
   psql -U postgres -d sorted_fund -f src/db/schema.sql

   # Run migrations
   psql -U postgres -d sorted_fund -f src/db/migrations/003_add_deposit_addresses.sql
   psql -U postgres -d sorted_fund -f src/db/migrations/004_add_tx_hash_to_refuels.sql
   ```

3. **Generate HD wallet master seed:**

   ⚠️ **SECURITY WARNING**: The master mnemonic controls all project deposit addresses. Keep it secret and secure!

   ```bash
   cd backend
   node scripts/generate-master-seed.js
   # Copy the generated 12-word mnemonic
   ```

4. **Configure environment variables:**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env and add:
   # - DATABASE_URL
   # - MASTER_MNEMONIC (from step 3)
   # - PAYMASTER_PRIVATE_KEY
   # - SONIC_RPC_URL

   # Contracts
   cd ../contracts
   cp .env.example .env
   # Edit .env with your deployer private key
   ```

5. **Deploy smart contracts (if not already deployed):**
   ```bash
   cd contracts
   npx hardhat run scripts/deploy-paymaster.ts --network sonic
   # Copy paymaster address to backend/.env as PAYMASTER_ADDRESS
   ```

6. **Start the backend:**
   ```bash
   cd backend
   npm run dev
   # Backend will run on http://localhost:3000
   ```

7. **Open the developer dashboard:**
   ```bash
   # In a new terminal
   cd frontend/dashboard-v2
   python3 -m http.server 8080
   # Open http://localhost:8080 in your browser
   ```

## HD Wallet Architecture

Sorted.fund uses **BIP-44 HD wallet derivation** to generate unique deposit addresses for each project:

- **Derivation Path**: `44'/60'/0'/0/{projectIndex}`
- **Master Mnemonic**: Single 12-word seed phrase stored in `MASTER_MNEMONIC` env var
- **Deterministic**: Same project index always generates the same address
- **Secure**: Private keys never stored in database, derived on-demand from master seed

### How it works:

1. Developer creates a project → backend assigns next derivation index (0, 1, 2...)
2. Backend derives deposit address from master seed + index
3. Deposit address stored in database for easy lookup
4. When funds arrive, backend can reconstruct private key to forward to paymaster

**Example:**
- Project "test-game" → index 0 → deposit address `0x225CFA583705912C31b40625A39f8CD8790AfF84`
- Project "my-app" → index 1 → deposit address `0x...` (different)

## Manual Funding Workflow

Since automatic deposit detection requires Alchemy webhooks (production feature), Phase 3 uses **manual crediting**:

1. **Developer sends S tokens** to their project's deposit address (on Sonic testnet)
2. **Admin verifies transaction** on [Sonic Explorer](https://testnet.soniclabs.com)
3. **Admin credits gas tank** using the manual refuel script:
   ```bash
   cd backend
   ./scripts/manual-refuel.sh test-game 5.0 0xTRANSACTION_HASH "Initial funding"
   ```
4. **Gas tank balance updates** in database and dashboard

### Using the Manual Refuel Script:

```bash
# Basic usage (amount in S tokens)
./scripts/manual-refuel.sh <project_id> <amount_in_S> [tx_hash] [note]

# Examples:
./scripts/manual-refuel.sh test-game 10.0
./scripts/manual-refuel.sh test-game 5.5 0xabc123... "Top-up from deposit"
```

The script:
- Converts S to wei automatically
- Confirms before executing
- Updates `gas_tank_balance` in projects table
- Records entry in `gas_tank_refuels` table
- Returns updated project balance

## Phase Achievements

### Phase 1: Foundation & Environment Setup
✅ Monorepo structure created (contracts, backend, sdk, demo)
✅ Git repository initialized with comprehensive .gitignore
✅ TypeScript/Node.js backend with Express
✅ Hardhat smart contract framework configured
✅ SDK package structure initialized
✅ Environment variable templates created
✅ Sonic testnet RPC configured and tested
✅ EntryPoint v0.7 contract verified on Sonic testnet

### Phase 2: Smart Contract Development & Deployment
✅ SortedPaymaster verifying paymaster contract (ERC-4337 v0.7)
✅ Allowlist-based authorization system
✅ Policy hash verification for security
✅ Deployed to Sonic testnet: `0x41B35AAD2e3F8c36ad883c354AEa828a2100Bb4a`
✅ TestCounter demo contract deployed: `0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3`
✅ SimpleAccount (ERC-4337 v0.7) deployed: `0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506`
✅ Paymaster funded and operational

### Phase 3: Developer Dashboard & Live Demo
✅ PostgreSQL database with complete schema
✅ Backend API with authorization, allowlist, analytics endpoints
✅ BIP-44 HD wallet for project deposit addresses
✅ Manual refuel system with transaction tracking
✅ Terminal-aesthetic developer dashboard (Vanilla JS)
✅ Live demo page executing real gasless transactions
✅ Blockchain reading service (counter values, balances)
✅ API key generation and authentication
✅ Allowlist management UI
✅ Gas tank balance tracking
✅ Comprehensive integration testing

## Network Information

- **Network**: Sonic Testnet
- **Chain ID**: 14601
- **RPC URL**: https://rpc.testnet.soniclabs.com
- **EntryPoint v0.7**: `0x0000000071727de22e5e9d8baf0edac6f37da032`
- **Explorer**: https://testnet.soniclabs.com

## Development

### Backend

```bash
cd backend
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run test:connectivity  # Test Sonic testnet connection
```

### Contracts

```bash
cd contracts
npm run compile      # Compile smart contracts
npm run test         # Run contract tests
npm run deploy:sonic # Deploy to Sonic testnet
```

### SDK

```bash
cd sdk
npm run build        # Build SDK
npm run dev          # Watch mode
npm run test         # Run tests
```

## Testing the System

### Quick Test Flow:

1. **Create a test project:**
   ```bash
   curl -X POST http://localhost:3000/projects \
     -H "Content-Type: application/json" \
     -d '{"id":"my-test","name":"My Test App","owner":"0xYourAddress"}'
   ```

2. **Generate API key:**
   ```bash
   curl -X POST http://localhost:3000/projects/my-test/apikeys
   # Copy the returned apiKey
   ```

3. **Add contract to allowlist:**
   ```bash
   curl -X POST http://localhost:3000/projects/my-test/allowlist \
     -H "Content-Type: application/json" \
     -d '{"targetContract":"0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3","functionSelector":"0xd09de08a"}'
   ```

4. **Fund the gas tank:**
   ```bash
   # Send S tokens to your project's deposit_address
   # Then credit manually:
   ./backend/scripts/manual-refuel.sh my-test 5.0 0xTxHash "Initial funding"
   ```

5. **Request authorization:**
   ```bash
   curl -X POST http://localhost:3000/sponsor/authorize \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d '{
       "projectId":"my-test",
       "chainId":14601,
       "user":"0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506",
       "target":"0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3",
       "selector":"0xd09de08a",
       "estimatedGas":500000,
       "clientNonce":"'$(date +%s)000'"
     }'
   ```

## Next Steps

### Phase 4: SDK & Client Libraries
- Build TypeScript SDK for developers
- UserOperation builder with paymasterAndData integration
- Pimlico bundler integration
- Example integrations (React, Node.js)

### Phase 5: Production Features
- Alchemy Notify webhooks for automatic deposit detection
- Automated fund forwarding to paymaster
- Real-time analytics and monitoring
- Usage-based billing system
- Multi-project support with authentication

See `docs/sorted-fund/implementation-plan.md` for detailed roadmap.

## Documentation

- [Overview](docs/sorted-fund/overview.md) - Project thesis and goals
- [Architecture](docs/sorted-fund/architecture.md) - System design and flow
- [Backend Spec](docs/sorted-fund/backend-spec.md) - API and data model
- [Roadmap](docs/sorted-fund/roadmap.md) - Development timeline
- [Implementation Plan](docs/sorted-fund/implementation-plan.md) - Step-by-step guide
- [Sonic Testnet Config](docs/sorted-fund/sonic-testnet-config.md) - Network details

## Resources

- [Sonic Documentation](https://docs.soniclabs.com)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Pimlico Docs](https://docs.pimlico.io)
- [Hardhat Documentation](https://hardhat.org/docs)

## License

MIT
