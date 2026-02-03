/**
 * Chain Service
 * Multi-chain registry and config lookup.
 */

import { query } from '../db/database';

export interface ChainConfig {
  chain_id: number;
  name: string;
  rpc_url: string;
  entrypoint_address: string | null;
  native_symbol: string;
  paymaster_address: string | null;
  is_testnet: boolean;
  status: 'active' | 'disabled';
}

function getEnvPaymasterForChain(chainId: number): string | null {
  const specific = process.env[`PAYMASTER_ADDRESS_${chainId}`];
  if (specific) {
    return specific;
  }
  return process.env.PAYMASTER_ADDRESS || null;
}

function getEnvRpcForChain(chainId: number): string | null {
  const specific = process.env[`RPC_URL_${chainId}`];
  if (specific) {
    return specific;
  }
  if (chainId === 14601) {
    return process.env.SONIC_RPC_URL || null;
  }
  return null;
}

export class ChainService {
  private getRuntimeAllowedChainIds(): number[] {
    const raw = process.env.RUNTIME_ALLOWED_CHAIN_IDS || process.env.SONIC_CHAIN_ID || '14601';
    return raw
      .split(',')
      .map((v) => parseInt(v.trim(), 10))
      .filter((v) => !Number.isNaN(v));
  }

  isRuntimeChainAllowed(chainId: number): boolean {
    const allowed = this.getRuntimeAllowedChainIds();
    return allowed.includes(chainId);
  }

  assertRuntimeChainAllowed(chainId: number): void {
    if (!this.isRuntimeChainAllowed(chainId)) {
      throw new Error(`Chain ${chainId} is disabled for runtime traffic`);
    }
  }

  async listActiveChains(): Promise<ChainConfig[]> {
    const result = await query<ChainConfig>(
      `SELECT chain_id, name, rpc_url, entrypoint_address, native_symbol, paymaster_address, is_testnet, status
       FROM chains
       WHERE status = 'active'
       ORDER BY chain_id ASC`
    );

    return result.rows;
  }

  async getChain(chainId: number): Promise<ChainConfig | null> {
    const result = await query<ChainConfig>(
      `SELECT chain_id, name, rpc_url, entrypoint_address, native_symbol, paymaster_address, is_testnet, status
       FROM chains
       WHERE chain_id = $1`,
      [chainId]
    );

    return result.rows[0] || null;
  }

  async getEffectiveChainConfig(chainId: number): Promise<{
    chainId: number;
    name: string;
    rpcUrl: string;
    entrypointAddress?: string | null;
    paymasterAddress: string;
  }> {
    const chain = await this.getChain(chainId);
    if (!chain || chain.status !== 'active') {
      throw new Error(`Unsupported or inactive chain: ${chainId}`);
    }
    this.assertRuntimeChainAllowed(chainId);

    const rpcUrl = getEnvRpcForChain(chainId) || chain.rpc_url;
    const paymasterAddress = getEnvPaymasterForChain(chainId) || chain.paymaster_address;

    if (!rpcUrl) {
      throw new Error(`No RPC configured for chain ${chainId}`);
    }

    if (!paymasterAddress) {
      throw new Error(`No paymaster configured for chain ${chainId}`);
    }

    return {
      chainId,
      name: chain.name,
      rpcUrl,
      entrypointAddress: chain.entrypoint_address,
      paymasterAddress,
    };
  }

  getDefaultChainId(): number {
    return parseInt(process.env.SONIC_CHAIN_ID || '14601', 10);
  }
}

export default new ChainService();
