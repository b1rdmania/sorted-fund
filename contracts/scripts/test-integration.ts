/**
 * Phase 5 Integration Test
 * End-to-end test of gasless transactions with Sorted.fund
 */

import { ethers } from 'hardhat';
import { SortedClient } from '../../sdk/src/index';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuration
const SORTED_API_KEY = process.env.SORTED_API_KEY;
const SORTED_BACKEND_URL = process.env.SORTED_BACKEND_URL || 'http://localhost:3000';
const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY;
const SIMPLE_ACCOUNT_ADDRESS = process.env.SIMPLE_ACCOUNT_ADDRESS!;
const TEST_COUNTER_ADDRESS = process.env.TEST_COUNTER_ADDRESS!;
const INCREMENT_SELECTOR = process.env.INCREMENT_SELECTOR!;
const ENTRYPOINT_ADDRESS = process.env.ENTRYPOINT_ADDRESS || '0x0000000071727de22e5e9d8baf0edac6f37da032';

/**
 * Pack gas limits into accountGasLimits (32 bytes)
 * Bytes 0-15: verificationGasLimit
 * Bytes 16-31: callGasLimit
 */
function packGasLimits(verificationGasLimit: bigint, callGasLimit: bigint): string {
  const vgl = verificationGasLimit.toString(16).padStart(32, '0');
  const cgl = callGasLimit.toString(16).padStart(32, '0');
  return '0x' + vgl + cgl;
}

/**
 * Pack gas fees into gasFees (32 bytes)
 * Bytes 0-15: maxPriorityFeePerGas
 * Bytes 16-31: maxFeePerGas
 */
function packGasFees(maxPriorityFeePerGas: bigint, maxFeePerGas: bigint): string {
  const mpfpg = maxPriorityFeePerGas.toString(16).padStart(32, '0');
  const mfpg = maxFeePerGas.toString(16).padStart(32, '0');
  return '0x' + mpfpg + mfpg;
}

async function main() {
  if (!SORTED_API_KEY) {
    throw new Error('SORTED_API_KEY is required');
  }

  console.log('🧪 Phase 5 Integration Test\n');
  console.log('=' .repeat(60));

  // Check configuration
  console.log('\n⚙️  Configuration:');
  console.log(`   SimpleAccount: ${SIMPLE_ACCOUNT_ADDRESS}`);
  console.log(`   TestCounter: ${TEST_COUNTER_ADDRESS}`);
  console.log(`   increment() selector: ${INCREMENT_SELECTOR}`);
  console.log(`   EntryPoint: ${ENTRYPOINT_ADDRESS}`);
  console.log(`   Backend: ${SORTED_BACKEND_URL}`);
  console.log(`   Pimlico API Key: ${PIMLICO_API_KEY ? '✅ Set' : '❌ Missing'}`);

  if (!PIMLICO_API_KEY) {
    console.log('\n❌ Pimlico API key required!');
    console.log('\n📝 To get a Pimlico API key:');
    console.log('   1. Visit https://dashboard.pimlico.io');
    console.log('   2. Sign up / Log in');
    console.log('   3. Create a new API key');
    console.log('   4. Add to .env: PIMLICO_API_KEY=your_key_here');
    console.log('\nExiting test...');
    return;
  }

  // Get signer (account owner)
  const [owner] = await ethers.getSigners();
  const ownerAddress = await owner.getAddress();
  console.log(`\n👤 Account Owner: ${ownerAddress}`);

  // Load contracts
  const testCounter = await ethers.getContractAt('TestCounter', TEST_COUNTER_ADDRESS);
  const simpleAccount = await ethers.getContractAt('SimpleAccount', SIMPLE_ACCOUNT_ADDRESS);

  // Get current counter value
  const counterBefore = await testCounter.getCounter(SIMPLE_ACCOUNT_ADDRESS);
  console.log(`\n📊 Counter Before: ${counterBefore}`);

  // Initialize Sorted SDK
  console.log('\n🔧 Initializing Sorted SDK...');
  const sorted = new SortedClient({
    apiKey: SORTED_API_KEY,
    backendUrl: SORTED_BACKEND_URL,
    pimlicoApiKey: PIMLICO_API_KEY,
    chainId: 14601,
  });
  console.log('   ✅ SDK initialized');

  // Build callData for increment()
  console.log('\n📝 Building UserOperation...');
  const incrementCallData = testCounter.interface.encodeFunctionData('increment', []);
  console.log(`   Increment callData: ${incrementCallData}`);

  // Build execute callData for SimpleAccount
  const executeCallData = simpleAccount.interface.encodeFunctionData('execute', [
    TEST_COUNTER_ADDRESS,
    0, // value
    incrementCallData,
  ]);

  // Get nonce
  const nonce = await simpleAccount.getNonce();
  console.log(`   Nonce: ${nonce}`);

  // Get gas price
  const feeData = await ethers.provider.getFeeData();
  const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits('1', 'gwei');
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('1', 'gwei');
  console.log(`   Max fee per gas: ${ethers.formatUnits(maxFeePerGas, 'gwei')} gwei`);

  // Request authorization from Sorted
  // Total gas = verificationGasLimit + callGasLimit + preVerificationGas + paymasterVerificationGas + paymasterPostOpGas
  // = 100000 + 200000 + 50000 + 30000 + 30000 = 410000
  console.log('\n🔐 Requesting sponsorship authorization...');
  const auth = await sorted.authorize({
    projectId: 'test-game',
    user: SIMPLE_ACCOUNT_ADDRESS,
    target: TEST_COUNTER_ADDRESS,
    selector: INCREMENT_SELECTOR,
    estimatedGas: 450000, // Total gas including paymaster gas
    clientNonce: '0x' + nonce.toString(16),
  });

  console.log('   ✅ Authorization received');
  console.log(`   paymasterAndData: ${auth.paymasterAndData.substring(0, 50)}...`);
  console.log(`   Expires at: ${auth.expiresAt}`);

  // Build UserOperation
  const userOp = {
    sender: SIMPLE_ACCOUNT_ADDRESS,
    nonce: nonce,
    initCode: '0x',
    callData: executeCallData,
    accountGasLimits: packGasLimits(100000n, 200000n),
    preVerificationGas: 50000n,
    gasFees: packGasFees(maxPriorityFeePerGas, maxFeePerGas),
    paymasterAndData: auth.paymasterAndData, // From Sorted!
    signature: '0x', // Will be filled after signing
  };

  // Sign the UserOperation
  console.log('\n✍️  Signing UserOperation...');
  const chainId = (await ethers.provider.getNetwork()).chainId;

  // Get userOpHash from EntryPoint
  const entryPoint = await ethers.getContractAt('@account-abstraction/contracts/interfaces/IEntryPoint.sol:IEntryPoint', ENTRYPOINT_ADDRESS);

  // Pack UserOp for hashing (this is complex, we'll use a helper)
  const packedUserOp = {
    sender: userOp.sender,
    nonce: userOp.nonce,
    initCode: userOp.initCode,
    callData: userOp.callData,
    accountGasLimits: userOp.accountGasLimits,
    preVerificationGas: userOp.preVerificationGas,
    gasFees: userOp.gasFees,
    paymasterAndData: userOp.paymasterAndData,
    signature: '0x',
  };

  const userOpHash = await entryPoint.getUserOpHash(packedUserOp);
  console.log(`   UserOpHash: ${userOpHash}`);

  // Sign with Ethereum signed message prefix
  const signature = await owner.signMessage(ethers.getBytes(userOpHash));
  userOp.signature = signature;
  console.log(`   Signature: ${signature.substring(0, 50)}...`);

  // Submit to Pimlico bundler
  console.log('\n🚀 Submitting UserOperation to Pimlico...');
  try {
    const userOpHashFromBundler = await sorted.submitUserOperation(userOp);
    console.log(`   ✅ UserOp submitted: ${userOpHashFromBundler}`);

    // Wait for confirmation
    console.log('\n⏳ Waiting for transaction confirmation...');
    console.log('   (This may take 10-30 seconds)');

    const receipt = await sorted.waitForUserOp(userOpHashFromBundler, 60000);

    if (receipt.success) {
      console.log('\n🎉 Transaction Successful!');
      console.log(`   TX Hash: ${receipt.transactionHash}`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas Used: ${receipt.actualGasUsed}`);
      console.log(`   Gas Cost: ${ethers.formatEther(receipt.actualGasCost || 0n)} S`);

      // Verify counter incremented
      console.log('\n✅ Verifying on-chain state...');
      const counterAfter = await testCounter.getCounter(SIMPLE_ACCOUNT_ADDRESS);
      console.log(`   Counter Before: ${counterBefore}`);
      console.log(`   Counter After: ${counterAfter}`);

      if (counterAfter > counterBefore) {
        console.log('   ✅ Counter incremented successfully!');
      } else {
        console.log('   ❌ Counter did not increment!');
      }

      // Get user data
      const userData = await testCounter.getUserData(SIMPLE_ACCOUNT_ADDRESS);
      console.log(`   Last Update: ${new Date(Number(userData.lastUpdate) * 1000).toISOString()}`);

    } else {
      console.log('\n❌ Transaction Failed');
      console.log(`   Reason: ${receipt.reason}`);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.details) {
      console.error('   Details:', error.details);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Integration Test Complete');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
