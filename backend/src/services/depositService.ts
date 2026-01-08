/**
 * Deposit Service
 * HD wallet management for project deposit addresses
 */

import { ethers } from 'ethers';

// BIP-44 path for Ethereum: 44'/60'/0'/0/{index}
// Note: No "m/" prefix since we derive from master node
const HD_PATH_PREFIX = "44'/60'/0'/0/";

// Sonic testnet RPC for sending transactions
const SONIC_RPC_URL = process.env.SONIC_RPC_URL || 'https://rpc.testnet.soniclabs.com';
const PAYMASTER_ADDRESS = process.env.PAYMASTER_ADDRESS;

/**
 * Get HD master node from mnemonic
 */
function getMasterNode(): ethers.HDNodeWallet {
  const masterMnemonic = process.env.MASTER_MNEMONIC;

  if (!masterMnemonic) {
    throw new Error('MASTER_MNEMONIC not set in environment');
  }

  return ethers.HDNodeWallet.fromPhrase(masterMnemonic);
}

/**
 * Generate deposit address for a project
 * @param projectIndex - Derivation index for the project (0, 1, 2, ...)
 * @returns Address and index
 */
export function generateDepositAddress(projectIndex: number): { address: string; index: number } {
  const masterNode = getMasterNode();

  // Derive child wallet at index
  const derivedWallet = masterNode.derivePath(`${HD_PATH_PREFIX}${projectIndex}`);

  return {
    address: derivedWallet.address,
    index: projectIndex
  };
}

/**
 * Get wallet for a project (for signing forwarding transactions)
 * @param projectIndex - Derivation index
 * @returns Wallet instance connected to provider
 */
export function getDepositWallet(projectIndex: number): ethers.HDNodeWallet {
  const masterNode = getMasterNode();

  // Derive child wallet at index
  const derivedWallet = masterNode.derivePath(`${HD_PATH_PREFIX}${projectIndex}`);

  // Connect to Sonic testnet provider
  const provider = new ethers.JsonRpcProvider(SONIC_RPC_URL);
  return derivedWallet.connect(provider) as ethers.HDNodeWallet;
}

/**
 * Forward funds from project deposit address to paymaster
 * @param projectIndex - Project derivation index
 * @param amount - Amount to forward (in wei)
 * @returns Transaction hash
 */
export async function forwardToPaymaster(projectIndex: number, amount: bigint): Promise<string> {
  if (!PAYMASTER_ADDRESS) {
    throw new Error('PAYMASTER_ADDRESS not set in environment');
  }

  // Get project wallet
  const wallet = getDepositWallet(projectIndex);

  // Check wallet has enough balance
  const balance = await wallet.provider!.getBalance(wallet.address);
  if (balance < amount) {
    throw new Error(`Insufficient balance. Has ${balance.toString()} wei, needs ${amount.toString()} wei`);
  }

  // Send transaction to paymaster
  const tx = await wallet.sendTransaction({
    to: PAYMASTER_ADDRESS,
    value: amount,
    gasLimit: 21000
  });

  console.log(`Forwarding ${amount.toString()} wei from ${wallet.address} to paymaster ${PAYMASTER_ADDRESS}`);
  console.log(`Transaction hash: ${tx.hash}`);

  // Wait for confirmation
  await tx.wait();

  return tx.hash;
}

/**
 * Test deterministic address generation
 * Verify same mnemonic + index always produces same address
 */
export function testDeterministicGeneration(): void {
  console.log('Testing HD wallet deterministic address generation...\n');

  const addresses: string[] = [];

  // Generate 3 addresses
  for (let i = 0; i < 3; i++) {
    const { address, index } = generateDepositAddress(i);
    addresses.push(address);
    console.log(`Project ${index}: ${address}`);
  }

  // Regenerate and verify they match
  console.log('\nVerifying deterministic generation...');
  for (let i = 0; i < 3; i++) {
    const { address } = generateDepositAddress(i);
    if (address !== addresses[i]) {
      throw new Error(`Address mismatch at index ${i}!`);
    }
  }

  console.log('✓ Addresses are deterministic!\n');
}
