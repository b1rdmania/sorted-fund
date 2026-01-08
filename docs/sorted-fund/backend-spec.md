# Backend Control Plane Specification

The backend is the **control plane** that signs sponsorship approvals consumed by the Sorted paymaster. It centralizes policy logic so the on-chain paymaster can remain stateless while enforcing hard safety limits.

## Responsibilities

* Project + API key management (per-project API key, status, owner contact).
* Gas tank accounting (balances, refuel history, emergency drains).
* Allowlist configuration (target contracts + function selectors).
* Rate limits, daily caps, and per-user limits.
* Sponsorship decisioning (including kill switches, gas-forwarding limits).
* Logging, analytics, and alerts for mismatched cost vs. estimate.

## Data Model (initial)

| Entity | Key Fields |
| --- | --- |
| Project | `id`, `owner`, `status`, `gasTankBalance`, `dailyCap`, `functionSelectors`, `allowlist` |
| API Key | `key`, `projectId`, `issuedAt`, `revokedAt`, `rateLimit` |
| Gas Tank | `balance`, `refuelEvents`, `reservedAmount` |
| Sponsorship Event | `id`, `userOpHash`, `selector`, `estimatedGas`, `actualGas`, `status`, `paymasterSignature` |

## `/sponsor/authorize` Schema

**Request**

```json
{
  "projectId": "sorted-game",
  "chainId": 114,
  "user": "0xabc...",
  "target": "0xFee0...",
  "selector": "0x12345678",
  "estimatedGas": 210000,
  "clientNonce": "0x42"
}
```

**Response**

```json
{
  "paymasterAndData": "<paymasterAddress><authorizationPayload>",
  "expiresAt": "2026-02-01T12:00:00Z",
  "maxCost": "0x1dcd6500",
  "policyHash": "0xdeadbeef"
}
```

The backend records the estimated gas and reserves max cost from the gas tank. After EntryPoint execution, actual usage is reconciled and any discrepancy logged (not enforced on-chain but surfaced for ops).

## Paymaster Payload Format

`paymasterAndData` concatenates:

1. Paymaster address (`0x123456...`) hard-coded entry point in SDK.
2. Expiry timestamp (`uint32`).
3. Max cost (`uint256`).
4. Policy hash (`bytes32` representing selectors/allowlist state).
5. Backend ECDSA signature over the authorization tuple (including sender, nonce, chainId, selector, maxCost, expiry).

Validation steps inside the Sorted paymaster:

* Verify `msg.sender` is EntryPoint v0.7.
* Parse `paymasterAndData` and recover signer.
* Confirm expiry > block.timestamp and max cost <= backend-provided limit.
* Ensure target contract + selector are still allowlisted.
* Enforce hard caps on `verificationGasLimit`, `callGasLimit`, `maxFeePerGas`, `maxPriorityFeePerGas`.
* Respect kill switch states (global/project/chain).

## Pimlico Bundler Integration

We submit UserOperations through Pimlico’s JSON-RPC endpoints after obtaining an API key (via `pnpm dlx @pimlico/cli@latest` or the [dashboard guide](https://docs.pimlico.io/guides/create-api-key)).

Required RPC calls:

* `eth_sendUserOperation` – send the full UserOp with `paymasterAndData` plus the backend signature. Pimlico returns a `userOpHash`.
* `eth_estimateUserOperationGas` – optional to confirm gas estimates before submission.
* `eth_getUserOperationReceipt` / `pimlico_getUserOperationStatus` – poll until the EntryPoint includes the operation.

Each call needs the Pimlico API key in the `Authorization` header or as part of their CLI configuration.

**UserOperation fields** to set (per `eth_sendUserOperation` docs):

* `sender`, `nonce`, `factory`, `factoryData`, `callData`.
* Gas limits: `callGasLimit`, `verificationGasLimit`, `preVerificationGas`, `maxFeePerGas`, `maxPriorityFeePerGas`.
* Paymaster fields: `paymaster`, `paymasterVerificationGasLimit`, `paymasterPostOpGasLimit`, `paymasterData`.
* `signature` (from the smart account).

## Testing & Observability

1. Unit test backend signature generation + paymaster parsing (use `ethers.utils.splitSignature`).
2. Validate kill switch toggles cause `/sponsor/authorize` to reject with `503`.
3. Simulate Pimlico `eth_sendUserOperation` responses (success, pending, failure) and ensure SDK surfaces clear error codes (`PAYMASTER_OUT_OF_BUDGET`, `KILLED`, `PIMLICO_REJECT`).
4. Log lifecycle events (authorization, bundler submission, paymaster reconciliation) with correlation IDs for later debugging.

Metric targets:

* API latency < 200ms.
* Usage logging covers 100% of sponsored flows.
* Kill switch activation moment propogates to on-chain paymaster in <5 min.

