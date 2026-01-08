/**
 * Authorization Service
 * Generates signed paymasterAndData payloads for UserOp sponsorship
 */

import { ethers } from 'ethers';
import { query } from '../db/database';
import {
  AuthorizeRequest,
  AuthorizeResponse,
  SponsorshipEvent,
  Allowlist,
} from '../types';
import projectService from './projectService';

export class AuthorizationService {
  private backendSigner: ethers.Wallet;
  private paymasterAddress: string;
  private chainId: number;

  constructor() {
    const privateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('BACKEND_SIGNER_PRIVATE_KEY not configured');
    }

    this.backendSigner = new ethers.Wallet(privateKey);
    this.paymasterAddress = process.env.PAYMASTER_ADDRESS || '';
    this.chainId = parseInt(process.env.SONIC_CHAIN_ID || '14601');

    console.log('🔑 Authorization Service initialized');
    console.log('   Backend Signer:', this.backendSigner.address);
    console.log('   Paymaster:', this.paymasterAddress);
    console.log('   Chain ID:', this.chainId);
  }

  /**
   * Authorize a sponsorship and generate signed paymasterAndData
   */
  async authorize(request: AuthorizeRequest): Promise<AuthorizeResponse> {
    const {
      projectId,
      chainId,
      user,
      target,
      selector,
      estimatedGas,
      clientNonce,
    } = request;

    // Validate chain ID
    if (chainId !== this.chainId) {
      throw new Error(`Invalid chain ID. Expected ${this.chainId}, got ${chainId}`);
    }

    // Get project
    const project = await projectService.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check project status
    if (project.status === 'killed') {
      throw new Error('Project is killed');
    }
    if (project.status === 'suspended') {
      throw new Error('Project is suspended');
    }

    // Check allowlist
    const isAllowed = await this.checkAllowlist(projectId, target, selector);
    if (!isAllowed) {
      throw new Error('Target/selector not allowlisted');
    }

    // Estimate max cost (gas * price + buffer)
    const provider = new ethers.JsonRpcProvider(process.env.SONIC_RPC_URL);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || BigInt(2000000000); // 2 Gwei fallback

    // Add 20% buffer to gas estimate
    const gasWithBuffer = BigInt(Math.floor(estimatedGas * 1.2));
    const maxCost = gasWithBuffer * gasPrice;

    // Check gas tank has sufficient balance
    const balance = await projectService.getGasTankBalance(projectId);
    if (BigInt(balance) < maxCost) {
      throw new Error('Insufficient gas tank balance');
    }

    // Check daily cap
    const withinCap = await projectService.checkDailyCap(projectId, maxCost.toString());
    if (!withinCap) {
      throw new Error('Daily cap exceeded');
    }

    // Reserve funds
    const reserved = await projectService.reserveFunds(projectId, maxCost.toString());
    if (!reserved) {
      throw new Error('Failed to reserve funds from gas tank');
    }

    // Generate expiry (1 hour from now)
    const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    // Generate policy hash (hash of allowlist state for this project)
    const policyHash = await this.generatePolicyHash(projectId);

    // Convert projectId to bytes32
    const projectIdBytes32 = ethers.id(projectId);

    // Generate signature
    const signature = await this.signAuthorization(
      user,
      clientNonce,
      expiry,
      maxCost,
      policyHash,
      projectIdBytes32
    );

    // Encode paymasterAndData
    const paymasterAndData = this.encodePaymasterAndData(
      expiry,
      maxCost,
      policyHash,
      projectIdBytes32,
      signature
    );

    // Record sponsorship event
    await this.recordSponsorshipEvent({
      project_id: projectId,
      sender: user,
      target,
      selector,
      estimated_gas: estimatedGas.toString(),
      max_cost: maxCost.toString(),
      paymaster_signature: signature,
      policy_hash: policyHash,
      expiry: new Date(expiry * 1000),
    });

    // Record daily spending
    await projectService.recordDailySpending(projectId, maxCost.toString());

    return {
      paymasterAndData,
      expiresAt: new Date(expiry * 1000).toISOString(),
      maxCost: '0x' + maxCost.toString(16),
      policyHash,
    };
  }

  /**
   * Check if target/selector is allowlisted for project
   */
  private async checkAllowlist(
    projectId: string,
    target: string,
    selector: string
  ): Promise<boolean> {
    const result = await query<Allowlist>(
      `SELECT * FROM allowlists
       WHERE project_id = $1
       AND target_contract = $2
       AND function_selector = $3
       AND enabled = true`,
      [projectId, target.toLowerCase(), selector.toLowerCase()]
    );

    return result.rows.length > 0;
  }

  /**
   * Generate policy hash (hash of project's allowlist)
   */
  private async generatePolicyHash(projectId: string): Promise<string> {
    const result = await query<Allowlist>(
      `SELECT target_contract, function_selector FROM allowlists
       WHERE project_id = $1 AND enabled = true
       ORDER BY target_contract, function_selector`,
      [projectId]
    );

    // Hash all allowlist entries together
    const entries = result.rows.map(
      (row) => row.target_contract + row.function_selector
    );
    const combined = entries.join('');

    return ethers.keccak256(ethers.toUtf8Bytes(combined || 'empty'));
  }

  /**
   * Sign authorization payload (matching contract signature scheme)
   */
  private async signAuthorization(
    sender: string,
    nonce: string,
    expiry: number,
    maxCost: bigint,
    policyHash: string,
    projectId: string
  ): Promise<string> {
    // Match contract's _getHash function exactly
    const hash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'uint48', 'uint256', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        sender,
        nonce,
        expiry,
        maxCost,
        policyHash,
        projectId,
        this.chainId,
        this.paymasterAddress,
      ]
    );

    // Sign with Ethereum signed message prefix (as contract expects)
    const signature = await this.backendSigner.signMessage(ethers.getBytes(hash));

    return signature;
  }

  /**
   * Encode paymasterAndData according to contract format
   */
  private encodePaymasterAndData(
    expiry: number,
    maxCost: bigint,
    policyHash: string,
    projectId: string,
    signature: string
  ): string {
    // Format according to ERC-4337 v0.7 spec:
    // Bytes 0-19: Paymaster address (20 bytes)
    // Bytes 20-35: paymasterVerificationGasLimit (16 bytes = uint128)
    // Bytes 36-51: paymasterPostOpGasLimit (16 bytes = uint128)
    // Bytes 52-57: Expiry (6 bytes = uint48)
    // Bytes 58-89: Max cost (32 bytes = uint256)
    // Bytes 90-121: Policy hash (32 bytes)
    // Bytes 122-153: Project ID (32 bytes)
    // Bytes 154-218: Signature (65 bytes)
    // Total: 219 bytes

    const paymasterAddressBytes = ethers.getBytes(this.paymasterAddress);

    // ERC-4337 v0.7 requires gas limits in paymasterAndData
    const verificationGasLimit = 30000n; // 30k gas for validation
    const postOpGasLimit = 30000n; // 30k gas for postOp

    const verificationGasLimitBytes = new Uint8Array(16);
    const vglBytes = ethers.toBeArray(verificationGasLimit);
    verificationGasLimitBytes.set(vglBytes, 16 - vglBytes.length);

    const postOpGasLimitBytes = new Uint8Array(16);
    const poglBytes = ethers.toBeArray(postOpGasLimit);
    postOpGasLimitBytes.set(poglBytes, 16 - poglBytes.length);

    const expiryBytes = ethers.toBeArray(expiry);
    const expiryPadded = new Uint8Array(6);
    expiryPadded.set(expiryBytes, Math.max(0, 6 - expiryBytes.length)); // Right-align

    const maxCostPadded = new Uint8Array(32);
    maxCostPadded.set(ethers.toBeArray(maxCost), 32 - ethers.toBeArray(maxCost).length);

    const policyHashBytes = ethers.getBytes(policyHash); // 32 bytes
    const projectIdBytes = ethers.getBytes(projectId); // 32 bytes
    const signatureBytes = ethers.getBytes(signature); // 65 bytes

    const combined = ethers.concat([
      paymasterAddressBytes,        // 20 bytes
      verificationGasLimitBytes,    // 16 bytes
      postOpGasLimitBytes,          // 16 bytes
      expiryPadded,                 // 6 bytes
      maxCostPadded,                // 32 bytes
      policyHashBytes,              // 32 bytes
      projectIdBytes,               // 32 bytes
      signatureBytes,               // 65 bytes
    ]);

    return ethers.hexlify(combined);
  }

  /**
   * Record sponsorship event in database
   */
  private async recordSponsorshipEvent(event: Partial<SponsorshipEvent>): Promise<void> {
    await query(
      `INSERT INTO sponsorship_events
       (project_id, sender, target, selector, estimated_gas, max_cost,
        status, paymaster_signature, policy_hash, expiry)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        event.project_id,
        event.sender,
        event.target,
        event.selector,
        event.estimated_gas,
        event.max_cost,
        'authorized',
        event.paymaster_signature,
        event.policy_hash,
        event.expiry,
      ]
    );
  }
}

export default new AuthorizationService();
