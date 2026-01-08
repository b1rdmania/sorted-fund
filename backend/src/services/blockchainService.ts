/**
 * Blockchain Service
 * Read on-chain state from Sonic testnet
 */

import { ethers } from 'ethers';

// Sonic testnet RPC
const SONIC_RPC_URL = process.env.SONIC_RPC_URL || 'https://rpc.testnet.soniclabs.com';
const provider = new ethers.JsonRpcProvider(SONIC_RPC_URL);

// TestCounter ABI (minimal - just what we need)
const COUNTER_ABI = [
  'function getCounter(address user) view returns (uint256)',
  'function counters(address user) view returns (uint256)',
  'function increment() public'
];

/**
 * Get current counter value from TestCounter contract for a specific user
 */
export async function getCounterValue(contractAddress: string, userAddress: string): Promise<number> {
  try {
    const contract = new ethers.Contract(contractAddress, COUNTER_ABI, provider);
    const count = await contract.getCounter(userAddress);
    return Number(count);
  } catch (error: any) {
    console.error('Failed to read counter value:', error);
    throw new Error(`Failed to read counter: ${error.message}`);
  }
}

/**
 * Get account balance (in wei)
 */
export async function getAccountBalance(address: string): Promise<string> {
  try {
    const balance = await provider.getBalance(address);
    return balance.toString();
  } catch (error: any) {
    console.error('Failed to read account balance:', error);
    throw new Error(`Failed to read balance: ${error.message}`);
  }
}

/**
 * Get current block number
 */
export async function getCurrentBlockNumber(): Promise<number> {
  try {
    return await provider.getBlockNumber();
  } catch (error: any) {
    console.error('Failed to get block number:', error);
    throw new Error(`Failed to get block number: ${error.message}`);
  }
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransaction(txHash: string, confirmations: number = 1): Promise<ethers.TransactionReceipt | null> {
  try {
    return await provider.waitForTransaction(txHash, confirmations);
  } catch (error: any) {
    console.error('Failed to wait for transaction:', error);
    throw new Error(`Failed to wait for tx: ${error.message}`);
  }
}
