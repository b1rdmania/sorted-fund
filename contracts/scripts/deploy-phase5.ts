/**
 * Phase 5 Deployment Script
 * Deploys SimpleAccount and TestCounter for end-to-end integration testing
 */

import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

const ENTRYPOINT_ADDRESS = process.env.ENTRYPOINT_ADDRESS || '0x0000000071727de22e5e9d8baf0edac6f37da032';

async function main() {
  console.log('🚀 Phase 5: Deploying Test Contracts\n');
  console.log('=' .repeat(60));

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log('\n📍 Deployment Info:');
  console.log(`   Deployer: ${deployerAddress}`);
  console.log(`   Balance: ${ethers.formatEther(balance)} S`);
  console.log(`   EntryPoint: ${ENTRYPOINT_ADDRESS}`);
  console.log(`   Network: ${(await ethers.provider.getNetwork()).name} (${(await ethers.provider.getNetwork()).chainId})`);

  // Deploy TestCounter
  console.log('\n📦 Deploying TestCounter...');
  const TestCounter = await ethers.getContractFactory('TestCounter');
  const testCounter = await TestCounter.deploy();
  await testCounter.waitForDeployment();
  const testCounterAddress = await testCounter.getAddress();
  console.log(`   ✅ TestCounter deployed: ${testCounterAddress}`);

  // Deploy SimpleAccount
  console.log('\n📦 Deploying SimpleAccount...');
  const SimpleAccount = await ethers.getContractFactory('SimpleAccount');
  const simpleAccount = await SimpleAccount.deploy(ENTRYPOINT_ADDRESS, deployerAddress);
  await simpleAccount.waitForDeployment();
  const simpleAccountAddress = await simpleAccount.getAddress();
  console.log(`   ✅ SimpleAccount deployed: ${simpleAccountAddress}`);
  console.log(`   Owner: ${deployerAddress}`);

  // Fund the smart account with some ETH
  console.log('\n💰 Funding SimpleAccount...');
  const fundTx = await deployer.sendTransaction({
    to: simpleAccountAddress,
    value: ethers.parseEther('0.01'), // 0.01 S for testing
  });
  await fundTx.wait();
  console.log(`   ✅ Sent 0.01 S to SimpleAccount`);

  // Deposit to EntryPoint
  console.log('\n💰 Depositing to EntryPoint...');
  const depositTx = await simpleAccount.addDeposit({ value: ethers.parseEther('0.005') });
  await depositTx.wait();
  const deposit = await simpleAccount.getDeposit();
  console.log(`   ✅ Deposited ${ethers.formatEther(deposit)} S to EntryPoint`);

  // Get increment function selector
  const incrementSelector = testCounter.interface.getFunction('increment')!.selector;
  console.log('\n🔍 Function Selectors:');
  console.log(`   increment(): ${incrementSelector}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ Phase 5 Deployment Complete\n');
  console.log('📋 Deployment Summary:');
  console.log(`   TestCounter: ${testCounterAddress}`);
  console.log(`   SimpleAccount: ${simpleAccountAddress}`);
  console.log(`   SimpleAccount Owner: ${deployerAddress}`);
  console.log(`   SimpleAccount Balance: ${ethers.formatEther(await ethers.provider.getBalance(simpleAccountAddress))} S`);
  console.log(`   SimpleAccount EntryPoint Deposit: ${ethers.formatEther(deposit)} S`);

  console.log('\n📝 Next Steps:');
  console.log('   1. Add TestCounter to backend allowlist:');
  console.log(`      Target: ${testCounterAddress}`);
  console.log(`      Selector: ${incrementSelector}`);
  console.log('   2. Update .env files with addresses');
  console.log('   3. Get Pimlico API key for Sonic testnet');
  console.log('   4. Run integration test');

  // Save to .env
  console.log('\n💾 Saving to contracts/.env...');
  const fs = require('fs');
  const envPath = require('path').join(__dirname, '../.env');
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Add new addresses
  if (!envContent.includes('SIMPLE_ACCOUNT_ADDRESS')) {
    envContent += `\n# Phase 5 Contracts\n`;
    envContent += `SIMPLE_ACCOUNT_ADDRESS=${simpleAccountAddress}\n`;
    envContent += `TEST_COUNTER_ADDRESS=${testCounterAddress}\n`;
    envContent += `INCREMENT_SELECTOR=${incrementSelector}\n`;
    fs.writeFileSync(envPath, envContent);
    console.log('   ✅ Addresses saved to .env');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
