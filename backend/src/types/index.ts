/**
 * TypeScript types and interfaces for Sorted.fund backend
 */

// Developer account types (Privy-backed auth)
export interface Developer {
  id: number;
  privy_user_id?: string | null;
  email: string | null;
  name: string | null;
  credit_balance: string; // bigint as string
  status: string;
  created_at: Date;
}

export interface Organization {
  id: number;
  slug: string;
  name: string;
  status: 'active' | 'suspended';
  default_for_developer_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export type OrganizationRole = 'owner' | 'admin' | 'developer' | 'viewer';

// Project types
export interface Project {
  id: string;
  name: string;
  owner: string;
  status: 'active' | 'suspended' | 'killed';
  gas_tank_balance: string; // bigint as string
  daily_cap: string; // bigint as string
  daily_spent: string; // bigint as string
  daily_reset_at: Date;
  created_at: Date;
  updated_at: Date;
  developer_id?: number; // Legacy ownership field (backward compatibility)
  organization_id?: number;
  deposit_address?: string | null; // legacy
  derivation_index?: number | null; // legacy
}

export interface CreateProjectRequest {
  id: string;
  name: string;
  owner: string;
  dailyCap?: string; // Optional, defaults to 1 ether
}

// API Key types
export interface ApiKey {
  id: number;
  key_hash: string;
  key_preview: string;
  project_id: string;
  rate_limit: number;
  issued_at: Date;
  revoked_at: Date | null;
  last_used_at: Date | null;
}

export interface GenerateApiKeyResponse {
  apiKey: string; // Full key (only returned once)
  preview: string;
  projectId: string;
  rateLimit: number;
}

// Allowlist types
export interface Allowlist {
  id: number;
  project_id: string;
  target_contract: string;
  function_selector: string;
  enabled: boolean;
  created_at: Date;
}

export interface AddAllowlistRequest {
  targetContract: string;
  functionSelector: string;
}

// Gas Tank types
export interface GasTankRefuel {
  id: number;
  project_id: string;
  amount: string; // bigint as string
  timestamp: Date;
  note: string | null;
  tx_hash: string | null; // On-chain deposit transaction hash
  forwarded_tx_hash: string | null; // Transaction hash when forwarded to paymaster
  status: 'pending' | 'confirmed' | 'forwarded' | 'failed';
}

export interface RefuelRequest {
  amount: string; // in wei as string
  note?: string;
  txHash?: string; // Optional: on-chain transaction hash for tracking
  chainId?: number;
}

// Sponsorship Event types
export interface SponsorshipEvent {
  id: number;
  project_id: string;
  chain_id?: number;
  developer_id?: number | null;
  user_op_hash: string | null;
  sender: string;
  target: string;
  selector: string;
  estimated_gas: string; // bigint as string
  actual_gas: string | null; // bigint as string
  max_cost: string; // bigint as string
  status: 'authorized' | 'pending' | 'success' | 'failed' | 'reverted';
  paymaster_signature: string;
  policy_hash: string;
  expiry: Date;
  created_at: Date;
  completed_at: Date | null;
  error_message: string | null;
  reserved_ledger_entry_id?: number | null;
  settled_ledger_entry_id?: number | null;
  released_ledger_entry_id?: number | null;
}

export interface Chain {
  chain_id: number;
  name: string;
  rpc_url: string;
  entrypoint_address: string | null;
  native_symbol: string;
  paymaster_address: string | null;
  is_testnet: boolean;
  status: 'active' | 'disabled';
}

export interface ProjectFundingAccount {
  id: number;
  project_id: string;
  chain_id: number;
  asset_symbol: string;
  deposit_address: string;
  derivation_index: number;
  status: 'active' | 'disabled';
  last_checked_block: string;
  created_at: Date;
  updated_at: Date;
}

// Authorization Request/Response types
export interface AuthorizeRequest {
  projectId: string;
  chainId: number;
  user: string;
  target: string;
  selector: string;
  estimatedGas: number;
  clientNonce: string;
}

export interface AuthorizeResponse {
  paymasterAndData: string;
  expiresAt: string; // ISO timestamp
  maxCost: string; // hex string
  policyHash: string; // hex string
  paymasterSignature: string; // for linking userOpHash later
}

// Rate Limit types
export interface RateLimit {
  id: number;
  api_key_id: number;
  window_start: Date;
  request_count: number;
}

// Error types
export interface ApiError {
  error: string;
  code: string;
  details?: any;
}

// Request with authenticated API key
export interface AuthenticatedRequest extends Express.Request {
  apiKey?: ApiKey;
  project?: Project;
}
