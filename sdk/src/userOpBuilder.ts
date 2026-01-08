/**
 * UserOperation Builder
 * Helpers for building ERC-4337 v0.7 UserOperations
 */

import { ethers } from 'ethers';
import { UserOperation } from './types';

export interface UserOpBuilderParams {
  sender: string; // Smart account address
  nonce: bigint;
  callData: string;
  callGasLimit?: bigint;
  verificationGasLimit?: bigint;
  preVerificationGas?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  paymasterAndData?: string;
  signature?: string;
  initCode?: string;
}

export class UserOperationBuilder {
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  /**
   * Build a complete UserOperation from parameters
   */
  async buildUserOp(params: UserOpBuilderParams): Promise<UserOperation> {
    // Get gas prices if not provided
    const feeData = await this.provider.getFeeData();
    const maxFeePerGas = params.maxFeePerGas ?? (feeData.maxFeePerGas ?? BigInt(1000000000)); // 1 gwei default
    const maxPriorityFeePerGas = params.maxPriorityFeePerGas ?? (feeData.maxPriorityFeePerGas ?? BigInt(1000000000));

    // Use provided gas limits or defaults
    const callGasLimit = params.callGasLimit ?? BigInt(100000);
    const verificationGasLimit = params.verificationGasLimit ?? BigInt(200000);
    const preVerificationGas = params.preVerificationGas ?? BigInt(50000);

    // Pack accountGasLimits (verificationGasLimit + callGasLimit)
    const accountGasLimits = this.packGasLimits(verificationGasLimit, callGasLimit);

    // Pack gasFees (maxPriorityFeePerGas + maxFeePerGas)
    const gasFees = this.packGasLimits(maxPriorityFeePerGas, maxFeePerGas);

    return {
      sender: params.sender,
      nonce: params.nonce,
      initCode: params.initCode ?? '0x',
      callData: params.callData,
      accountGasLimits,
      preVerificationGas,
      gasFees,
      paymasterAndData: params.paymasterAndData ?? '0x',
      signature: params.signature ?? '0x',
    };
  }

  /**
   * Pack two uint128 values into a bytes32
   * Used for accountGasLimits and gasFees
   */
  private packGasLimits(high: bigint, low: bigint): string {
    // Convert to hex and pad to 32 bytes each (64 hex chars)
    const highHex = high.toString(16).padStart(32, '0');
    const lowHex = low.toString(16).padStart(32, '0');
    return '0x' + highHex + lowHex;
  }

  /**
   * Get nonce for smart account from EntryPoint
   */
  async getNonce(entryPointAddress: string, sender: string, key: bigint = BigInt(0)): Promise<bigint> {
    const entryPoint = new ethers.Contract(
      entryPointAddress,
      ['function getNonce(address sender, uint192 key) view returns (uint256)'],
      this.provider
    );

    const nonce = await entryPoint.getNonce(sender, key);
    return BigInt(nonce.toString());
  }

  /**
   * Get current account balance
   */
  async getBalance(address: string): Promise<bigint> {
    const balance = await this.provider.getBalance(address);
    return BigInt(balance.toString());
  }

  /**
   * Encode execute call for SimpleAccount
   * execute(address dest, uint256 value, bytes calldata func)
   */
  encodeExecuteCall(target: string, value: bigint, data: string): string {
    const executeInterface = new ethers.Interface([
      'function execute(address dest, uint256 value, bytes calldata func)',
    ]);

    return executeInterface.encodeFunctionData('execute', [target, value, data]);
  }

  /**
   * Calculate UserOperation hash (for signing)
   * This is the hash that needs to be signed by the account owner
   */
  getUserOpHash(
    userOp: UserOperation,
    entryPointAddress: string,
    chainId: number
  ): string {
    // v0.7 hash calculation
    const packedUserOp = ethers.AbiCoder.defaultAbiCoder().encode(
      [
        'address', // sender
        'uint256', // nonce
        'bytes32', // initCodeHash
        'bytes32', // callDataHash
        'bytes32', // accountGasLimits
        'uint256', // preVerificationGas
        'bytes32', // gasFees
        'bytes32', // paymasterAndDataHash
      ],
      [
        userOp.sender,
        userOp.nonce,
        ethers.keccak256(userOp.initCode || '0x'),
        ethers.keccak256(userOp.callData),
        userOp.accountGasLimits,
        userOp.preVerificationGas,
        userOp.gasFees,
        ethers.keccak256(userOp.paymasterAndData || '0x'),
      ]
    );

    const userOpHash = ethers.keccak256(packedUserOp);

    // Final hash includes entryPoint and chainId
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'address', 'uint256'],
        [userOpHash, entryPointAddress, chainId]
      )
    );
  }

  /**
   * Sign UserOperation hash with EOA wallet
   * Returns signature suitable for SimpleAccount
   */
  async signUserOp(
    userOp: UserOperation,
    signer: ethers.Signer,
    entryPointAddress: string,
    chainId: number
  ): Promise<string> {
    const userOpHash = this.getUserOpHash(userOp, entryPointAddress, chainId);

    // Sign the hash
    const signature = await signer.signMessage(ethers.getBytes(userOpHash));

    return signature;
  }
}

export default UserOperationBuilder;
