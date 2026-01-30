# Contracts

Deployed contracts on Sonic Testnet (Chain ID: 14601).

## Addresses

| Contract | Address | Purpose |
|----------|---------|---------|
| **EntryPoint** | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | ERC-4337 v0.7 singleton |
| **SortedPaymaster** | `0x41B35AAD2e3F8c36ad883c354AEa828a2100Bb4a` | Our verifying paymaster |
| **Test Counter** | `0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3` | Demo contract for testing |

## SortedPaymaster

A verifying paymaster that sponsors gas for allowlisted transactions.

### How it works

1. Backend signs `paymasterAndData` with authorization details
2. User includes this in their UserOperation
3. EntryPoint calls the paymaster's `validatePaymasterUserOp`
4. Paymaster verifies the signature and approves payment
5. After execution, `postOp` is called for accounting

### Key functions

```solidity
function validatePaymasterUserOp(
    PackedUserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 maxCost
) external returns (bytes memory context, uint256 validationData);
```

Validates the UserOperation and decides whether to sponsor it.

```solidity
function postOp(
    PostOpMode mode,
    bytes calldata context,
    uint256 actualGasCost,
    uint256 actualUserOpFeePerGas
) external;
```

Called after execution to track actual gas used.

### Security

- Only accepts signatures from Sorted's backend signer
- Validates policy hash to prevent tampering
- Time-bounded validity windows
- Allowlist checked server-side before signing

## EntryPoint

The standard ERC-4337 v0.7 EntryPoint contract. Handles UserOperation validation and execution.

[View on Explorer →](https://testnet.sonicscan.org/address/0x0000000071727De22E5E9d8BAf0edAc6f37da032)

## Network Details

| Property | Value |
|----------|-------|
| Chain ID | 14601 |
| RPC URL | `https://rpc.testnet.soniclabs.com` |
| Explorer | `https://testnet.sonicscan.org` |
| Currency | S (Sonic) |

## Verifying Contracts

View any contract on the explorer:

```
https://testnet.sonicscan.org/address/{ADDRESS}
```
