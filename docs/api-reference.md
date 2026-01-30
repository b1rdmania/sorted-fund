# API Reference

Base URL: `https://sorted-backend.onrender.com`

## Authentication

All endpoints require an API key in the Authorization header:

```
Authorization: Bearer sk_sorted_your_api_key
```

Get your API key from the [dashboard](https://sorted.fund/dashboard.html).

---

## Sponsor

### POST /sponsor/authorize

Request authorization for a gasless transaction.

**Request:**

```json
{
  "projectId": "your-project-id",
  "user": "0x1234...",
  "target": "0xContractAddress",
  "selector": "0x12345678",
  "estimatedGas": 100000,
  "chainId": 14601,
  "clientNonce": "unique-request-id"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | Yes | Your project ID |
| `user` | address | Yes | User's wallet address |
| `target` | address | Yes | Contract being called |
| `selector` | bytes4 | Yes | Function selector (4 bytes) |
| `estimatedGas` | number | Yes | Estimated gas for the call |
| `chainId` | number | Yes | Chain ID (14601 for Sonic testnet) |
| `clientNonce` | string | No | Idempotency key |

**Response (200):**

```json
{
  "authorized": true,
  "paymasterAndData": "0x...",
  "signature": "0x...",
  "validUntil": 1706640000,
  "validAfter": 1706636400
}
```

**Errors:**

| Code | Meaning |
|------|---------|
| 400 | Invalid request (missing fields, bad format) |
| 401 | Invalid or missing API key |
| 403 | Contract/function not on allowlist |
| 402 | Insufficient gas tank balance |
| 429 | Rate limit exceeded |

---

## Projects

### GET /projects

List all your projects.

**Response:**

```json
[
  {
    "id": "my-game",
    "name": "My Game",
    "deposit_address": "0x...",
    "gas_tank_balance": "1000000000000000000",
    "created_at": "2026-01-30T12:00:00Z"
  }
]
```

### POST /projects

Create a new project.

**Request:**

```json
{
  "id": "my-game",
  "name": "My Game",
  "owner": "owner-id"
}
```

### GET /projects/:id

Get a specific project.

### GET /projects/:id/balance

Get gas tank balance.

**Response:**

```json
{
  "balance": "1000000000000000000",
  "balanceFormatted": "1.0",
  "currency": "S"
}
```

---

## API Keys

### GET /projects/:id/apikeys

List API keys for a project.

**Response:**

```json
[
  {
    "id": 1,
    "key_preview": "sk_sorted_abc1",
    "rate_limit": 100,
    "issued_at": "2026-01-30T12:00:00Z",
    "last_used_at": "2026-01-30T14:00:00Z",
    "revoked_at": null
  }
]
```

### POST /projects/:id/apikeys

Generate a new API key.

**Request:**

```json
{
  "rateLimit": 100
}
```

**Response:**

```json
{
  "apiKey": "sk_sorted_full_key_shown_once",
  "keyPreview": "sk_sorted_abc1",
  "rateLimit": 100
}
```

::: warning
The full API key is only shown once. Save it securely.
:::

---

## Allowlist

### GET /projects/:id/allowlist

List allowlisted contracts and functions.

**Response:**

```json
[
  {
    "target_contract": "0x...",
    "function_selector": "0x12345678",
    "enabled": true,
    "created_at": "2026-01-30T12:00:00Z"
  }
]
```

### POST /projects/:id/allowlist

Add an allowlist entry.

**Request:**

```json
{
  "targetContract": "0xContractAddress",
  "functionSelector": "0x12345678"
}
```

### DELETE /projects/:id/allowlist

Remove an allowlist entry.

**Request:**

```json
{
  "targetContract": "0xContractAddress",
  "functionSelector": "0x12345678"
}
```

---

## Analytics

### GET /projects/:id/analytics/overview

Get project analytics.

**Response:**

```json
{
  "totalSponsored": 1234,
  "totalGasSaved": "5000000000000000000",
  "activeUsers": 567,
  "today": {
    "sponsored": 42,
    "dailyCapRemaining": "100000000000000000"
  },
  "topContracts": [
    {
      "address": "0x...",
      "calls": 500,
      "gasUsed": "2000000000000000000"
    }
  ]
}
```

### GET /projects/:id/analytics/events

Get recent transaction events.

**Query params:**

- `limit` — Max results (default 50)
- `offset` — Pagination offset

**Response:**

```json
{
  "events": [
    {
      "id": 1,
      "sender": "0x...",
      "target": "0x...",
      "status": "success",
      "estimated_gas": 100000,
      "actual_gas": 85000,
      "created_at": "2026-01-30T12:00:00Z"
    }
  ],
  "total": 1234
}
```

---

## Health

### GET /health

Check if the API is running.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-01-30T12:00:00Z",
  "service": "sorted-backend",
  "version": "0.1.0"
}
```
