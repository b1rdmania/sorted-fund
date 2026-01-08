/**
 * SDK Type Definitions
 */

// Configuration
export interface SortedConfig {
  apiKey: string;
  backendUrl: string;
  pimlicoApiKey?: string;
  chainId?: number;
}

// Authorization
export interface AuthorizeParams {
  projectId: string;
  user: string;
  target: string;
  selector: string;
  estimatedGas: number;
  clientNonce: string;
}

export interface AuthorizeResponse {
  paymasterAndData: string;
  expiresAt: string;
  maxCost: string;
  policyHash: string;
}

// UserOperation (ERC-4337 v0.7)
export interface UserOperation {
  sender: string;
  nonce: bigint;
  initCode: string;
  callData: string;
  accountGasLimits: string;
  preVerificationGas: bigint;
  gasFees: string;
  paymasterAndData: string;
  signature: string;
}

// Sponsored Transaction
export interface SponsoredTxParams {
  account: string; // Smart account address
  target: string; // Contract to call
  value?: bigint; // ETH value (usually 0)
  data: string; // Call data
  nonce?: bigint; // Optional nonce (fetched if not provided)
}

// Transaction Receipt
export interface TransactionReceipt {
  userOpHash: string;
  transactionHash?: string;
  blockNumber?: number;
  blockHash?: string;
  success: boolean;
  actualGasCost?: bigint;
  actualGasUsed?: bigint;
  logs?: any[];
  reason?: string;
}

// Pimlico Types
export interface PimlicoUserOpReceipt {
  userOpHash: string;
  entryPoint: string;
  sender: string;
  nonce: string;
  paymaster?: string;
  actualGasCost: string;
  actualGasUsed: string;
  success: boolean;
  reason?: string;
  logs: any[];
  receipt: {
    transactionHash: string;
    blockNumber: number;
    blockHash: string;
  };
}

export interface PimlicoUserOpStatus {
  status: 'pending' | 'included' | 'rejected' | 'failed';
  transactionHash?: string;
}

// Error Types
export class SortedError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SortedError';
  }
}

export class AuthorizationError extends SortedError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHORIZATION_ERROR', details);
    this.name = 'AuthorizationError';
  }
}

export class BundlerError extends SortedError {
  constructor(message: string, details?: any) {
    super(message, 'BUNDLER_ERROR', details);
    this.name = 'BundlerError';
  }
}
