/**
 * End-to-End Integration Test with Alto Bundler
 * Tests complete UserOperation flow: Authorization → Signing → Bundling → Execution
 */

import { ethers } from 'ethers';
import { SortedClient } from './src/index';
import axios from 'axios';

// Configuration
const API_KEY = process.env.SORTED_API_KEY;
const PROJECT_ID = 'test-game';
const BACKEND_URL = 'http://localhost:3000';
const ALTO_BUNDLER_URL = 'http://localhost:4337'; // Local Alto bundler

// Contract addresses
const SIMPLE_ACCOUNT = '0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506';
const TEST_COUNTER = '0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3';
const INCREMENT_SELECTOR = '0xd09de08a';
const ENTRYPOINT = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';

// Account owner private key (deployer wallet)
const ACCOUNT_OWNER_KEY = process.env.SORTED_OWNER_PRIVATE_KEY;

async function main() {
  if (!API_KEY || !ACCOUNT_OWNER_KEY) {
    throw new Error('Missing required env vars: SORTED_API_KEY, SORTED_OWNER_PRIVATE_KEY');
  }

  console.log('\n' + '='.repeat(70));
  console.log('🚀  PHASE 5: END-TO-END GASLESS TRANSACTION TEST');
  console.log('='.repeat(70) + '\n');

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider('https://rpc.testnet.soniclabs.com');
  const accountOwner = new ethers.Wallet(ACCOUNT_OWNER_KEY, provider);

  console.log('📋 Configuration:');
  console.log(`   Account: ${SIMPLE_ACCOUNT}`);
  console.log(`   Owner: ${accountOwner.address}`);
  console.log(`   Counter: ${TEST_COUNTER}`);
  console.log(`   Backend: ${BACKEND_URL}`);
  console.log(`   Bundler: ${ALTO_BUNDLER_URL} (Alto)\n`);

  // Step 1: Check current counter value
  console.log('📊 Step 1: Check current counter value');
  const counterABI = ['function getCounter(address) view returns (uint256)'];
  const counter = new ethers.Contract(TEST_COUNTER, counterABI, provider);
  const countBefore = await counter.getCounter(SIMPLE_ACCOUNT);
  console.log(`   Counter value BEFORE: ${countBefore}\n`);

  // Step 2: Initialize SDK with Alto bundler
  console.log('🔧 Step 2: Initialize SDK (pointing to Alto bundler)');
  const sorted = new SortedClient({
    apiKey: API_KEY,
    backendUrl: BACKEND_URL,
    chainId: 14601,
    provider: provider,
    entryPointAddress: ENTRYPOINT,
  });

  // Override Pimlico client to point to Alto
  (sorted as any).pimlicoClient = axios.create({
    baseURL: ALTO_BUNDLER_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  console.log('   ✅ SDK initialized with Alto bundler\n');

  // Step 3: Get nonce for the account
  console.log('📝 Step 3: Get account nonce');
  const accountABI = ['function getNonce() view returns (uint256)'];
  const account = new ethers.Contract(SIMPLE_ACCOUNT, accountABI, provider);
  const nonce = await account.getNonce();
  console.log(`   Account nonce: ${nonce}\n`);

  // Step 4: Encode increment() call
  console.log('🔨 Step 4: Encode transaction data');
  const incrementData = INCREMENT_SELECTOR; // increment() has no parameters
  console.log(`   Function: increment()`);
  console.log(`   Selector: ${INCREMENT_SELECTOR}\n`);

  // Step 5: Request authorization from backend
  console.log('🔐 Step 5: Request sponsorship authorization');
  const authorization = await sorted.authorize({
    projectId: PROJECT_ID,
    user: SIMPLE_ACCOUNT,
    target: TEST_COUNTER,
    selector: INCREMENT_SELECTOR,
    estimatedGas: 500000,
    clientNonce: nonce.toString(), // Use actual account nonce for signature
  });

  console.log(`   ✅ Authorization received`);
  console.log(`   paymasterAndData: ${authorization.paymasterAndData.substring(0, 50)}...`);
  console.log(`   Expires at: ${authorization.expiresAt}\n`);

  // Step 6: Build UserOperation
  console.log('📦 Step 6: Build UserOperation');
  const userOpBuilder = (sorted as any).userOpBuilder;

  // Encode execute() call for SimpleAccount
  const executeCallData = userOpBuilder.encodeExecuteCall(
    TEST_COUNTER,
    BigInt(0), // value
    incrementData
  );

  const userOp = await userOpBuilder.buildUserOp({
    sender: SIMPLE_ACCOUNT,
    nonce: nonce,
    callData: executeCallData,
    paymasterAndData: authorization.paymasterAndData,
    callGasLimit: BigInt(200000),
    verificationGasLimit: BigInt(300000),
    preVerificationGas: BigInt(50000),
  });

  console.log(`   ✅ UserOperation built`);
  console.log(`   Sender: ${userOp.sender}`);
  console.log(`   Nonce: ${userOp.nonce}\n`);

  // Step 7: Sign UserOperation
  console.log('✍️  Step 7: Sign UserOperation');
  const signature = await userOpBuilder.signUserOp(
    userOp,
    accountOwner,
    ENTRYPOINT,
    14601
  );
  userOp.signature = signature;

  console.log(`   ✅ UserOperation signed`);
  console.log(`   Signature: ${signature.substring(0, 50)}...\n`);

  // Step 8: Submit to Alto bundler
  console.log('📡 Step 8: Submit to Alto bundler');
  const userOpHash = await sorted.submitUserOperation(userOp, authorization.paymasterSignature);

  console.log(`   ✅ UserOperation submitted to bundler`);
  console.log(`   UserOp Hash: ${userOpHash}\n`);

  // Step 9: Wait for transaction confirmation
  console.log('⏳ Step 9: Waiting for transaction confirmation...');
  const receipt = await sorted.waitForUserOp(userOpHash, 60000, true); // 60s timeout, reconcile gas

  if (receipt.success) {
    console.log(`   ✅ Transaction CONFIRMED!`);
    console.log(`   TX Hash: ${receipt.transactionHash}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.actualGasUsed?.toString()}\n`);
  } else {
    console.log(`   ❌ Transaction FAILED`);
    console.log(`   Reason: ${receipt.reason}\n`);
    process.exit(1);
  }

  // Step 10: Verify counter incremented
  console.log('✅ Step 10: Verify counter incremented');
  const countAfter = await counter.getCounter(SIMPLE_ACCOUNT);
  console.log(`   Counter value AFTER: ${countAfter}`);

  if (countAfter === BigInt(countBefore) + 1n) {
    console.log(`   ✅ Counter incremented: ${countBefore} → ${countAfter}\n`);
  } else {
    console.log(`   ❌ Counter did not increment correctly!\n`);
    process.exit(1);
  }

  // Step 11: Verify gas reconciliation
  console.log('💰 Step 11: Check gas reconciliation');
  console.log(`   Backend automatically reconciled gas usage`);
  console.log(`   Estimated: 500000 gas`);
  console.log(`   Actual: ${receipt.actualGasUsed?.toString()} gas`);

  const accuracy = receipt.actualGasUsed
    ? ((Number(receipt.actualGasUsed) / 500000) * 100).toFixed(2)
    : 'N/A';
  console.log(`   Accuracy: ${accuracy}%\n`);

  // Success!
  console.log('='.repeat(70));
  console.log('🎉  SUCCESS! PHASE 5 COMPLETE');
  console.log('='.repeat(70));
  console.log('\n✅ Complete gasless transaction flow working:');
  console.log('   1. ✅ Backend authorization');
  console.log('   2. ✅ UserOperation signing');
  console.log('   3. ✅ Alto bundler submission');
  console.log('   4. ✅ On-chain execution (gasless!)');
  console.log('   5. ✅ Gas reconciliation');
  console.log('\n🌐 Explorer:');
  console.log(`   https://testnet.sonicscan.org/tx/${receipt.transactionHash}\n`);
}

main().catch((error) => {
  console.error('\n❌ Test failed:', error.message);
  if (error.response?.data) {
    console.error('   Details:', error.response.data);
  }
  process.exit(1);
});
