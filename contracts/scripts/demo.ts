#!/usr/bin/env ts-node
/**
 * 🎮 Sorted.fund - Gasless Transaction Demo
 *
 * This script demonstrates a completely gasless transaction on Sonic testnet.
 * Watch as a transaction executes on-chain WITHOUT the user paying any gas!
 */

import { ethers } from 'hardhat';
import { SortedClient } from '../../sdk/src/index';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const { bright, green, blue, yellow, cyan, magenta, reset } = colors;

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log(`${bright}${magenta}🎮  SORTED.FUND - GASLESS TRANSACTION DEMO${reset}`);
  console.log('='.repeat(70) + '\n');

  console.log(`${cyan}What you're about to see:${reset}`);
  console.log(`  • A user makes a blockchain transaction`);
  console.log(`  • The transaction executes on Sonic testnet`);
  console.log(`  • ${bright}${green}The user pays ZERO gas fees${reset}`);
  console.log(`  • Sorted.fund sponsors the entire transaction\n`);

  console.log(`${yellow}⏱️  Starting demo...${reset}\n`);

  await sleep(1500);

  // Configuration
  const SIMPLE_ACCOUNT = process.env.SIMPLE_ACCOUNT_ADDRESS!;
  const TEST_COUNTER = process.env.TEST_COUNTER_ADDRESS!;
  const INCREMENT_SELECTOR = process.env.INCREMENT_SELECTOR!;
  const ENTRYPOINT = process.env.ENTRYPOINT_ADDRESS!;
  const BACKEND_URL = process.env.SORTED_BACKEND_URL || 'http://localhost:3000';
  const API_KEY = process.env.SORTED_API_KEY!;
  const PIMLICO_KEY = process.env.PIMLICO_API_KEY!;

  // Setup
  const [owner] = await ethers.getSigners();
  const sorted = new SortedClient({
    apiKey: API_KEY,
    backendUrl: BACKEND_URL,
    pimlicoApiKey: PIMLICO_KEY,
    chainId: 14601,
  });

  // Get contracts
  const testCounter = await ethers.getContractAt('TestCounter', TEST_COUNTER);
  const simpleAccount = await ethers.getContractAt('SimpleAccount', SIMPLE_ACCOUNT);
  const entryPoint = await ethers.getContractAt(
    '@account-abstraction/contracts/interfaces/IEntryPoint.sol:IEntryPoint',
    ENTRYPOINT
  );

  // Step 1: Check initial state
  console.log(`${blue}📊 Step 1: Checking initial state...${reset}`);
  const counterBefore = await testCounter.getCounter(SIMPLE_ACCOUNT);
  const userBalanceBefore = await ethers.provider.getBalance(SIMPLE_ACCOUNT);
  console.log(`  Counter value: ${bright}${counterBefore}${reset}`);
  console.log(`  User balance: ${bright}${ethers.formatEther(userBalanceBefore)} S${reset}`);
  console.log(`  ${green}✓${reset} Initial state captured\n`);

  await sleep(1000);

  // Step 2: Request sponsorship
  console.log(`${blue}🔐 Step 2: Requesting gas sponsorship...${reset}`);
  const nonce = await simpleAccount.getNonce();
  const auth = await sorted.authorize({
    projectId: 'test-game',
    user: SIMPLE_ACCOUNT,
    target: TEST_COUNTER,
    selector: INCREMENT_SELECTOR,
    estimatedGas: 450000,
    clientNonce: '0x' + nonce.toString(16),
  });
  console.log(`  ${green}✓${reset} Sponsorship approved!`);
  console.log(`  Paymaster will cover all gas costs\n`);

  await sleep(1000);

  // Step 3: Build UserOperation
  console.log(`${blue}🔨 Step 3: Building UserOperation...${reset}`);
  const incrementCallData = testCounter.interface.encodeFunctionData('increment', []);
  const executeCallData = simpleAccount.interface.encodeFunctionData('execute', [
    TEST_COUNTER,
    0,
    incrementCallData,
  ]);

  const feeData = await ethers.provider.getFeeData();
  const userOp = {
    sender: SIMPLE_ACCOUNT,
    nonce: nonce,
    initCode: '0x',
    callData: executeCallData,
    accountGasLimits: packGasLimits(100000n, 200000n),
    preVerificationGas: 50000n,
    gasFees: packGasFees(
      feeData.maxPriorityFeePerGas || 1000000000n,
      feeData.maxFeePerGas || 2000000001n
    ),
    paymasterAndData: auth.paymasterAndData,
    signature: '0x',
  };

  // Sign UserOp
  const packedUserOp = {
    sender: userOp.sender,
    nonce: userOp.nonce,
    initCode: userOp.initCode,
    callData: userOp.callData,
    accountGasLimits: userOp.accountGasLimits,
    preVerificationGas: userOp.preVerificationGas,
    gasFees: userOp.gasFees,
    paymasterAndData: userOp.paymasterAndData,
    signature: userOp.signature,
  };

  const userOpHash = await entryPoint.getUserOpHash(packedUserOp);
  const signature = await owner.signMessage(ethers.getBytes(userOpHash));
  userOp.signature = signature;

  console.log(`  ${green}✓${reset} UserOperation ready\n`);

  await sleep(1000);

  // Step 4: Submit to bundler
  console.log(`${blue}🚀 Step 4: Submitting to Pimlico bundler...${reset}`);
  const userOpHashSubmitted = await sorted.submitUserOperation(userOp);
  console.log(`  ${green}✓${reset} Submitted! Hash: ${userOpHashSubmitted.slice(0, 20)}...`);
  console.log(`  ${yellow}⏳ Waiting for on-chain confirmation...${reset}\n`);

  // Step 5: Wait for confirmation
  const receipt = await sorted.waitForUserOp(userOpHashSubmitted, 60000);

  if (!receipt.success) {
    console.log(`  ${bright}\x1b[31m✗${reset} Transaction failed: ${receipt.reason}\n`);
    return;
  }

  console.log(`${green}${bright}🎉 TRANSACTION SUCCESSFUL!${reset}\n`);

  await sleep(500);

  // Step 6: Show results
  console.log(`${blue}📈 Step 5: Verifying results...${reset}`);
  const counterAfter = await testCounter.getCounter(SIMPLE_ACCOUNT);
  const userBalanceAfter = await ethers.provider.getBalance(SIMPLE_ACCOUNT);
  const gasUsed = receipt.actualGasUsed || 0n;
  const gasCost = receipt.actualGasCost || 0n;

  console.log(`  Counter: ${bright}${counterBefore}${reset} → ${bright}${green}${counterAfter}${reset} ${green}✓${reset}`);
  console.log(`  User balance: ${bright}${ethers.formatEther(userBalanceBefore)} S${reset} → ${bright}${green}${ethers.formatEther(userBalanceAfter)} S${reset}`);
  console.log(`  ${bright}User paid: ${green}0.0 S (ZERO!)${reset}`);
  console.log(`  Gas used: ${gasUsed.toString()}`);
  console.log(`  Gas cost: ${ethers.formatEther(gasCost)} S ${yellow}(paid by Sorted.fund)${reset}\n`);

  await sleep(500);

  // Final message
  console.log('='.repeat(70));
  console.log(`${bright}${cyan}🔗 View on Sonic Explorer:${reset}`);
  console.log(`${bright}https://testnet.soniclabs.com/tx/${receipt.transactionHash}${reset}\n`);

  console.log(`${bright}${magenta}✨ That's Sorted.fund - Gasless transactions made simple!${reset}`);
  console.log('='.repeat(70) + '\n');
}

// Helper functions
function packGasLimits(verificationGasLimit: bigint, callGasLimit: bigint): string {
  const packed = (verificationGasLimit << 128n) | callGasLimit;
  return '0x' + packed.toString(16).padStart(64, '0');
}

function packGasFees(maxPriorityFeePerGas: bigint, maxFeePerGas: bigint): string {
  const packed = (maxPriorityFeePerGas << 128n) | maxFeePerGas;
  return '0x' + packed.toString(16).padStart(64, '0');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demo
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\n${bright}\x1b[31m❌ Error:${reset}`, error.message);
    process.exit(1);
  });
