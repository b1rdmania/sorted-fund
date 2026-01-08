/**
 * Sorted.fund SDK
 *
 * TypeScript SDK for building gasless applications with Sorted.fund
 */

import axios, { AxiosInstance } from 'axios';
import { ethers } from 'ethers';
import {
  SortedConfig,
  AuthorizeParams,
  AuthorizeResponse,
  SponsoredTxParams,
  TransactionReceipt,
  UserOperation,
  PimlicoUserOpReceipt,
  PimlicoUserOpStatus,
  AuthorizationError,
  BundlerError,
} from './types';
import { UserOperationBuilder } from './userOpBuilder';

export * from './types';
export * from './userOpBuilder';

export class SortedClient {
  private config: SortedConfig;
  private backendClient: AxiosInstance;
  private pimlicoClient?: AxiosInstance;
  private provider?: ethers.Provider;
  private userOpBuilder?: UserOperationBuilder;
  private entryPointAddress: string;

  constructor(config: SortedConfig) {
    this.config = {
      chainId: 14601, // Sonic testnet default
      entryPointAddress: '0x0000000071727de22e5e9d8baf0edac6f37da032', // EntryPoint v0.7
      ...config,
    };

    this.entryPointAddress = this.config.entryPointAddress!;

    // Backend API client
    this.backendClient = axios.create({
      baseURL: this.config.backendUrl,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Pimlico bundler client (v1 for bundler methods)
    if (this.config.pimlicoApiKey) {
      const pimlicoUrl = `https://api.pimlico.io/v1/${this.config.chainId}/rpc?apikey=${this.config.pimlicoApiKey}`;
      this.pimlicoClient = axios.create({
        baseURL: pimlicoUrl,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
    }

    // Provider and UserOperation builder (if provider is provided)
    if (this.config.provider) {
      this.provider = this.config.provider;
      this.userOpBuilder = new UserOperationBuilder(this.provider);
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): SortedConfig {
    return { ...this.config };
  }

  /**
   * Authorize a UserOperation for gas sponsorship
   * Calls backend /sponsor/authorize to get signed paymasterAndData
   */
  async authorize(params: AuthorizeParams): Promise<AuthorizeResponse> {
    try {
      const response = await this.backendClient.post<AuthorizeResponse>(
        '/sponsor/authorize',
        {
          ...params,
          chainId: this.config.chainId,
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw new AuthorizationError(
          error.response.data.error || 'Authorization failed',
          error.response.data
        );
      }
      throw new AuthorizationError('Failed to authorize sponsorship', error.message);
    }
  }

  /**
   * Submit a UserOperation to Pimlico bundler
   */
  async submitUserOperation(userOp: UserOperation): Promise<string> {
    if (!this.pimlicoClient) {
      throw new BundlerError('Pimlico API key not configured');
    }

    try {
      const response = await this.pimlicoClient.post('', {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_sendUserOperation',
        params: [
          this.serializeUserOp(userOp),
          process.env.ENTRYPOINT_ADDRESS || '0x0000000071727de22e5e9d8baf0edac6f37da032',
        ],
      });

      if (response.data.error) {
        throw new BundlerError(
          response.data.error.message || 'Bundler rejected UserOperation',
          response.data.error
        );
      }

      return response.data.result; // userOpHash
    } catch (error: any) {
      if (error instanceof BundlerError) throw error;
      throw new BundlerError('Failed to submit UserOperation', error.message);
    }
  }

  /**
   * Get UserOperation status from Pimlico
   */
  async getUserOpStatus(userOpHash: string): Promise<PimlicoUserOpStatus> {
    if (!this.pimlicoClient) {
      throw new BundlerError('Pimlico API key not configured');
    }

    try {
      const response = await this.pimlicoClient.post('', {
        jsonrpc: '2.0',
        id: 1,
        method: 'pimlico_getUserOperationStatus',
        params: [userOpHash],
      });

      return response.data.result;
    } catch (error: any) {
      throw new BundlerError('Failed to get UserOp status', error.message);
    }
  }

  /**
   * Get UserOperation receipt from Pimlico
   */
  async getUserOpReceipt(userOpHash: string): Promise<PimlicoUserOpReceipt | null> {
    if (!this.pimlicoClient) {
      throw new BundlerError('Pimlico API key not configured');
    }

    try {
      const response = await this.pimlicoClient.post('', {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getUserOperationReceipt',
        params: [userOpHash],
      });

      return response.data.result;
    } catch (error: any) {
      throw new BundlerError('Failed to get UserOp receipt', error.message);
    }
  }

  /**
   * Wait for UserOperation to be included on-chain
   * Optionally reconciles gas with backend after completion
   */
  async waitForUserOp(
    userOpHash: string,
    timeout: number = 60000,
    reconcileGas: boolean = true
  ): Promise<TransactionReceipt> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < timeout) {
      try {
        const receipt = await this.getUserOpReceipt(userOpHash);

        if (receipt) {
          const result: TransactionReceipt = {
            userOpHash: receipt.userOpHash,
            transactionHash: receipt.receipt.transactionHash,
            blockNumber: receipt.receipt.blockNumber,
            blockHash: receipt.receipt.blockHash,
            success: receipt.success,
            actualGasCost: BigInt(receipt.actualGasCost),
            actualGasUsed: BigInt(receipt.actualGasUsed),
            logs: receipt.logs,
            reason: receipt.reason,
          };

          // Reconcile gas with backend if enabled
          if (reconcileGas && result.actualGasUsed) {
            try {
              await this.reconcileGas({
                userOpHash,
                actualGas: result.actualGasUsed.toString(),
                status: result.success ? 'success' : 'failed',
                errorMessage: result.reason,
              });
            } catch (error) {
              // Log but don't fail - reconciliation is optional
              console.warn('Gas reconciliation failed:', error);
            }
          }

          return result;
        }

        // Check status
        const status = await this.getUserOpStatus(userOpHash);

        if (status.status === 'rejected' || status.status === 'failed') {
          const failedResult: TransactionReceipt = {
            userOpHash,
            success: false,
            reason: `UserOperation ${status.status}`,
          };

          // Try to reconcile failure if we have the info
          if (reconcileGas) {
            try {
              await this.reconcileGas({
                userOpHash,
                actualGas: '0',
                status: 'failed',
                errorMessage: failedResult.reason,
              });
            } catch (error) {
              console.warn('Gas reconciliation failed:', error);
            }
          }

          return failedResult;
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        // Continue polling on errors
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    throw new BundlerError('UserOperation timeout - not included within timeout period');
  }

  /**
   * Reconcile gas usage with backend after transaction completes
   * Updates sponsorship event with actual gas used
   */
  async reconcileGas(params: {
    userOpHash: string;
    actualGas: string;
    status: 'success' | 'failed' | 'reverted';
    errorMessage?: string;
  }): Promise<void> {
    try {
      await this.backendClient.post('/sponsor/reconcile', params);
    } catch (error: any) {
      if (error.response?.data) {
        throw new AuthorizationError(
          error.response.data.error || 'Gas reconciliation failed',
          error.response.data
        );
      }
      throw new AuthorizationError('Failed to reconcile gas', error.message);
    }
  }

  /**
   * High-level helper: Send a sponsored transaction
   * Handles the full flow: authorize → build UserOp → submit → wait for receipt
   *
   * This implementation works with SimpleAccount (ERC-4337 v0.7)
   */
  async sendSponsoredTx(params: SponsoredTxParams): Promise<TransactionReceipt> {
    if (!this.userOpBuilder) {
      throw new Error('Provider not configured. Pass provider in SortedConfig to use sendSponsoredTx()');
    }

    if (!this.pimlicoClient) {
      throw new Error('Pimlico API key not configured. Pass pimlicoApiKey in SortedConfig.');
    }

    // Step 1: Get nonce for smart account
    const nonce = params.nonce ?? await this.userOpBuilder.getNonce(
      this.entryPointAddress,
      params.account
    );

    // Step 2: Encode execute call for SimpleAccount
    // execute(address dest, uint256 value, bytes calldata func)
    const callData = this.userOpBuilder.encodeExecuteCall(
      params.target,
      params.value ?? BigInt(0),
      params.data
    );

    // Step 3: Authorize sponsorship with backend
    const authResponse = await this.authorize({
      projectId: params.projectId,
      user: params.account,
      target: params.target,
      selector: params.selector,
      estimatedGas: params.estimatedGas ?? 500000,
      clientNonce: Date.now().toString(),
    });

    // Step 4: Build UserOperation with paymaster data
    let userOp = await this.userOpBuilder.buildUserOp({
      sender: params.account,
      nonce,
      callData,
      paymasterAndData: authResponse.paymasterAndData,
      callGasLimit: BigInt(200000),
      verificationGasLimit: BigInt(300000),
      preVerificationGas: BigInt(50000),
    });

    // Step 5: Sign UserOperation
    const signature = await this.userOpBuilder.signUserOp(
      userOp,
      params.accountSigner,
      this.entryPointAddress,
      this.config.chainId!
    );

    userOp.signature = signature;

    // Step 6: Submit to Pimlico bundler
    const userOpHash = await this.submitUserOperation(userOp);

    // Step 7: Wait for confirmation
    const receipt = await this.waitForUserOp(userOpHash);

    return receipt;
  }

  /**
   * Serialize UserOperation for Pimlico
   * Uses v0.7 UnpackedUserOperation format (Pimlico expects unpacked even for v0.7)
   */
  private serializeUserOp(userOp: UserOperation): any {
    // Unpack accountGasLimits (bytes 0-15: verificationGasLimit, bytes 16-31: callGasLimit)
    const accountGasLimitsHex = userOp.accountGasLimits.startsWith('0x')
      ? userOp.accountGasLimits.slice(2)
      : userOp.accountGasLimits;
    const verificationGasLimit = '0x' + accountGasLimitsHex.slice(0, 32);
    const callGasLimit = '0x' + accountGasLimitsHex.slice(32, 64);

    // Unpack gasFees (bytes 0-15: maxPriorityFeePerGas, bytes 16-31: maxFeePerGas)
    const gasFeesHex = userOp.gasFees.startsWith('0x')
      ? userOp.gasFees.slice(2)
      : userOp.gasFees;
    const maxPriorityFeePerGas = '0x' + gasFeesHex.slice(0, 32);
    const maxFeePerGas = '0x' + gasFeesHex.slice(32, 64);

    // v0.7 uses factory/factoryData instead of initCode
    const initCodeHex = userOp.initCode || '0x';
    const hasFactory = initCodeHex && initCodeHex !== '0x' && initCodeHex.length > 42;
    const factory = hasFactory ? initCodeHex.slice(0, 42) : undefined;
    const factoryData = hasFactory ? ('0x' + initCodeHex.slice(42)) : undefined;

    // v0.7 paymasterAndData unpacking
    // Format: paymaster(20) || verificationGasLimit(16) || postOpGasLimit(16) || paymasterData
    const paymasterAndDataHex = userOp.paymasterAndData;
    const hasPaymaster = paymasterAndDataHex && paymasterAndDataHex !== '0x' && paymasterAndDataHex.length > 42;

    let paymaster: string | undefined;
    let paymasterVerificationGasLimit: string | undefined;
    let paymasterPostOpGasLimit: string | undefined;
    let paymasterData: string | undefined;

    if (hasPaymaster) {
      // Extract paymaster address (20 bytes = 40 hex chars, + 2 for 0x = 42)
      paymaster = paymasterAndDataHex.slice(0, 42);

      // Extract gas limits (16 bytes each = 32 hex chars each)
      // Bytes 20-35 (chars 42-74): verificationGasLimit
      paymasterVerificationGasLimit = '0x' + paymasterAndDataHex.slice(42, 74);
      // Bytes 36-51 (chars 74-106): postOpGasLimit
      paymasterPostOpGasLimit = '0x' + paymasterAndDataHex.slice(74, 106);

      // Remaining bytes: paymasterData
      paymasterData = '0x' + paymasterAndDataHex.slice(106);
    }

    // Build result, only including fields that are defined
    const result: any = {
      sender: userOp.sender,
      nonce: '0x' + userOp.nonce.toString(16),
      callData: userOp.callData,
      callGasLimit,
      verificationGasLimit,
      preVerificationGas: '0x' + userOp.preVerificationGas.toString(16),
      maxFeePerGas,
      maxPriorityFeePerGas,
      signature: userOp.signature,
    };

    // Only add factory fields if factory exists
    if (factory) {
      result.factory = factory;
      result.factoryData = factoryData;
    }

    // Only add paymaster fields if paymaster exists
    if (paymaster) {
      result.paymaster = paymaster;
      result.paymasterVerificationGasLimit = paymasterVerificationGasLimit;
      result.paymasterPostOpGasLimit = paymasterPostOpGasLimit;
      result.paymasterData = paymasterData;
    }

    return result;
  }

  /**
   * Estimate UserOperation gas (via Pimlico)
   */
  async estimateUserOpGas(userOp: Partial<UserOperation>): Promise<{
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
  }> {
    if (!this.pimlicoClient) {
      throw new BundlerError('Pimlico API key not configured');
    }

    try {
      const response = await this.pimlicoClient.post('', {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_estimateUserOperationGas',
        params: [
          this.serializeUserOp(userOp as UserOperation),
          process.env.ENTRYPOINT_ADDRESS || '0x0000000071727de22e5e9d8baf0edac6f37da032',
        ],
      });

      if (response.data.error) {
        throw new BundlerError(
          response.data.error.message || 'Gas estimation failed',
          response.data.error
        );
      }

      const result = response.data.result;
      return {
        callGasLimit: BigInt(result.callGasLimit),
        verificationGasLimit: BigInt(result.verificationGasLimit),
        preVerificationGas: BigInt(result.preVerificationGas),
      };
    } catch (error: any) {
      if (error instanceof BundlerError) throw error;
      throw new BundlerError('Failed to estimate gas', error.message);
    }
  }
}

export default SortedClient;
