/**
 * End-to-End Integration Test
 * Tests the complete SDK flow with real backend and Pimlico bundler
 */

import { ethers } from 'ethers';
import { SortedClient } from '../../dist/index';

// Configuration
const CONFIG = {
  // Backend API
  backendUrl: 'http://localhost:3000',
  apiKey: process.env.SORTED_API_KEY || 'sk_sorted_c2b9e0ece64c3e988dcad47b170dd19b5041ac1dc7e5ddd1ed33aa9e2f988271',
  projectId: 'test-game',

  // Pimlico bundler
  pimlicoApiKey: process.env.PIMLICO_API_KEY || '', // Add your Pimlico API key here

  // Sonic testnet
  rpcUrl: 'https://rpc.testnet.soniclabs.com',
  chainId: 14601,
  entryPointAddress: '0x0000000071727de22e5e9d8baf0edac6f37da032',

  // Contracts
  simpleAccount: '0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506', // Our deployed SimpleAccount
  testCounter: '0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3', // TestCounter contract
  incrementSelector: '0xd09de08a', // increment() function selector

  // Account owner (this should be the EOA that controls the SimpleAccount)
  // For testing, you can use a test private key
  accountOwnerPrivateKey: process.env.ACCOUNT_OWNER_KEY || '',
};

async function main() {
  console.log('🚀 Starting Sorted.fund SDK Integration Test\n');

  // Validate configuration
  if (!CONFIG.pimlicoApiKey) {
    console.error('❌ Error: PIMLICO_API_KEY not set');
    console.log('Set it in environment: export PIMLICO_API_KEY=your_key');
    process.exit(1);
  }

  if (!CONFIG.accountOwnerPrivateKey) {
    console.error('❌ Error: ACCOUNT_OWNER_KEY not set');
    console.log('Set it in environment: export ACCOUNT_OWNER_KEY=0x...');
    process.exit(1);
  }

  // Step 1: Setup provider and signer
  console.log('📡 Connecting to Sonic testnet...');
  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  const accountOwner = new ethers.Wallet(CONFIG.accountOwnerPrivateKey, provider);
  console.log(`✓ Connected with account owner: ${accountOwner.address}\n`);

  // Step 2: Initialize SDK client
  console.log('🔧 Initializing Sorted SDK...');
  const client = new SortedClient({
    apiKey: CONFIG.apiKey,
    backendUrl: CONFIG.backendUrl,
    pimlicoApiKey: CONFIG.pimlicoApiKey,
    chainId: CONFIG.chainId,
    provider,
    entryPointAddress: CONFIG.entryPointAddress,
  });
  console.log('✓ SDK initialized\n');

  // Step 3: Check counter value before transaction
  console.log('📊 Checking TestCounter state...');
  const counterContract = new ethers.Contract(
    CONFIG.testCounter,
    ['function getCounter(address user) view returns (uint256)'],
    provider
  );
  const counterBefore = await counterContract.getCounter(CONFIG.simpleAccount);
  console.log(`Counter value before: ${counterBefore}\n`);

  // Step 4: Prepare increment() call data
  console.log('📝 Preparing transaction call data...');
  const counterInterface = new ethers.Interface(['function increment()']);
  const incrementCallData = counterInterface.encodeFunctionData('increment');
  console.log(`Call data: ${incrementCallData}\n`);

  // Step 5: Send sponsored transaction
  console.log('🎯 Sending gasless transaction...');
  console.log('Steps:');
  console.log('  1. Authorize with backend');
  console.log('  2. Build UserOperation');
  console.log('  3. Sign with account owner');
  console.log('  4. Submit to Pimlico bundler');
  console.log('  5. Wait for confirmation\n');

  try {
    const receipt = await client.sendSponsoredTx({
      projectId: CONFIG.projectId,
      account: CONFIG.simpleAccount,
      accountSigner: accountOwner,
      target: CONFIG.testCounter,
      selector: CONFIG.incrementSelector,
      data: incrementCallData,
      estimatedGas: 500000,
    });

    console.log('✅ Transaction confirmed!\n');
    console.log('Receipt:');
    console.log(`  UserOp Hash: ${receipt.userOpHash}`);
    console.log(`  Transaction Hash: ${receipt.transactionHash}`);
    console.log(`  Block Number: ${receipt.blockNumber}`);
    console.log(`  Success: ${receipt.success}`);
    console.log(`  Gas Used: ${receipt.actualGasUsed?.toString()}`);
    console.log(`  Gas Cost: ${receipt.actualGasCost?.toString()} wei\n`);

    // Step 6: Verify counter incremented
    console.log('🔍 Verifying state change...');
    const counterAfter = await counterContract.getCounter(CONFIG.simpleAccount);
    console.log(`Counter value after: ${counterAfter}`);

    if (counterAfter === counterBefore + BigInt(1)) {
      console.log('✅ Counter incremented correctly!\n');
    } else {
      console.log(`❌ Unexpected counter value. Expected ${counterBefore + BigInt(1)}, got ${counterAfter}\n`);
    }

    // Step 7: Check backend logs
    console.log(`\n🔗 View transaction on explorer:`);
    console.log(`https://testnet.soniclabs.com/tx/${receipt.transactionHash}\n`);

    console.log('🎉 Integration test passed!');

  } catch (error: any) {
    console.error('❌ Transaction failed:\n');
    console.error(error.message);
    if (error.details) {
      console.error('\nDetails:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
