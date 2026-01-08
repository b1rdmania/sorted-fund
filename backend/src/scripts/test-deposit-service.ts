/**
 * Test Deposit Service
 * Verify HD wallet address generation works correctly
 */

import dotenv from 'dotenv';
import * as depositService from '../services/depositService';

// Load environment variables
dotenv.config();

async function main() {
  console.log('=== Testing Deposit Service ===\n');

  try {
    // Test deterministic generation
    depositService.testDeterministicGeneration();

    // Test individual functions
    console.log('Testing individual functions...\n');

    // Generate address for project 0
    const { address, index } = depositService.generateDepositAddress(0);
    console.log(`Generated address for project ${index}:`);
    console.log(`  Address: ${address}`);

    // Get wallet
    const wallet = depositService.getDepositWallet(0);
    console.log(`  Wallet address: ${wallet.address}`);
    console.log(`  Match: ${wallet.address === address ? '✓' : '✗'}\n`);

    // Check balance
    const balance = await wallet.provider!.getBalance(wallet.address);
    console.log(`Current balance: ${balance.toString()} wei (${Number(balance) / 1e18} S)`);

    console.log('\n✅ All tests passed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
