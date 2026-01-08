/**
 * Sonic Testnet Connectivity Test
 *
 * This script verifies that we can connect to Sonic testnet and interact with the EntryPoint contract.
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const SONIC_RPC_URL = process.env.SONIC_RPC_URL || 'https://rpc.testnet.soniclabs.com';
const EXPECTED_CHAIN_ID = 14601; // Sonic testnet actual chain ID
const ENTRYPOINT_ADDRESS = '0x0000000071727de22e5e9d8baf0edac6f37da032';

async function testConnectivity() {
  console.log('🔍 Testing Sonic Testnet Connectivity...\n');

  try {
    // 1. Connect to RPC
    console.log('1️⃣  Connecting to RPC:', SONIC_RPC_URL);
    const provider = new ethers.JsonRpcProvider(SONIC_RPC_URL);

    // 2. Check network
    console.log('2️⃣  Checking network...');
    const network = await provider.getNetwork();
    console.log('   ✅ Connected to chain ID:', network.chainId.toString());

    if (Number(network.chainId) !== EXPECTED_CHAIN_ID) {
      throw new Error(`Expected chain ID ${EXPECTED_CHAIN_ID}, got ${network.chainId}`);
    }
    console.log('   ✅ Chain ID matches expected value');

    // 3. Get block number
    console.log('3️⃣  Fetching latest block...');
    const blockNumber = await provider.getBlockNumber();
    console.log('   ✅ Latest block:', blockNumber);

    // 4. Check EntryPoint contract
    console.log('4️⃣  Checking EntryPoint contract...');
    const entryPointCode = await provider.getCode(ENTRYPOINT_ADDRESS);

    if (entryPointCode === '0x' || entryPointCode === '0x0') {
      throw new Error('EntryPoint contract not found at expected address');
    }
    console.log('   ✅ EntryPoint contract deployed at:', ENTRYPOINT_ADDRESS);
    console.log('   ✅ Contract bytecode length:', entryPointCode.length, 'bytes');

    // 5. Get gas price
    console.log('5️⃣  Fetching gas price...');
    const feeData = await provider.getFeeData();
    console.log('   ✅ Gas price:', ethers.formatUnits(feeData.gasPrice || 0n, 'gwei'), 'Gwei');
    console.log('   ✅ Max fee per gas:', ethers.formatUnits(feeData.maxFeePerGas || 0n, 'gwei'), 'Gwei');
    console.log('   ✅ Max priority fee:', ethers.formatUnits(feeData.maxPriorityFeePerGas || 0n, 'gwei'), 'Gwei');

    // 6. Test wallet balance (if private key provided)
    if (process.env.DEPLOYER_PRIVATE_KEY) {
      console.log('6️⃣  Checking deployer wallet balance...');
      const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
      const balance = await provider.getBalance(wallet.address);
      console.log('   ✅ Wallet address:', wallet.address);
      console.log('   ✅ Balance:', ethers.formatEther(balance), 'S');

      if (balance === 0n) {
        console.log('   ⚠️  Warning: Wallet has zero balance. Get testnet tokens from faucet.');
      }
    } else {
      console.log('6️⃣  Skipping wallet check (DEPLOYER_PRIVATE_KEY not set)');
    }

    console.log('\n✅ All connectivity tests passed!\n');
    console.log('📋 Summary:');
    console.log('   - RPC URL: ' + SONIC_RPC_URL);
    console.log('   - Chain ID: ' + EXPECTED_CHAIN_ID);
    console.log('   - EntryPoint: ' + ENTRYPOINT_ADDRESS);
    console.log('   - Latest Block: ' + blockNumber);
    console.log('\n✨ Ready to proceed with Phase 2 (Paymaster Contract)\n');

  } catch (error: any) {
    console.error('\n❌ Connectivity test failed:');
    console.error('   Error:', error.message);
    console.error('\nPlease check:');
    console.error('   - RPC URL is correct in .env');
    console.error('   - Network is accessible');
    console.error('   - EntryPoint address is correct');
    process.exit(1);
  }
}

// Run the test
testConnectivity();
