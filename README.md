# Sorted.fund

Gasless transaction sponsorship layer built on ERC-4337 Account Abstraction for Sonic testnet.

## Project Status

✅ **Phase 1 Complete** - Foundation & Environment Setup

Currently ready to proceed with Phase 2 (Smart Contract Development).

## Repository Structure

```
sorted/
├── backend/          # Control plane API (Express + TypeScript)
├── contracts/        # Smart contracts (Hardhat + Solidity)
├── sdk/             # TypeScript SDK for developers
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
- Git
- Sonic testnet tokens (from faucet)
- Pimlico API key

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

2. **Configure environment variables:**
   ```bash
   # Copy templates
   cp backend/.env.example backend/.env
   cp contracts/.env.example contracts/.env

   # Edit .env files with your values
   ```

3. **Test connectivity:**
   ```bash
   cd backend
   npm run test:connectivity
   ```

## Phase 1 Achievements

✅ Monorepo structure created (contracts, backend, sdk, demo)
✅ Git repository initialized with comprehensive .gitignore
✅ TypeScript/Node.js backend with Express
✅ Hardhat smart contract framework configured
✅ SDK package structure initialized
✅ Environment variable templates created
✅ Sonic testnet RPC configured and tested
✅ EntryPoint v0.7 contract verified on Sonic testnet

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

## Next Steps

Proceed to **Phase 2: Smart Contract - Verifying Paymaster**

See `docs/sorted-fund/implementation-plan.md` for detailed next steps.

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
