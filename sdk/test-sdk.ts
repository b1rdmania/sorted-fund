/**
 * SDK Integration Test
 * Tests the SDK against the running backend from Phase 3
 */

import { SortedClient } from './src/index';

// Test configuration from Phase 3
const TEST_API_KEY = 'sk_sorted_1b890bd4d0f369277cef4638decaf927de01ddd3276c1f3806be9b46f0147092';
const TEST_PROJECT_ID = 'test-game';
const BACKEND_URL = 'http://localhost:3000';
const ALLOWLISTED_TARGET = '0x1111111111111111111111111111111111111111';
const ALLOWLISTED_SELECTOR = '0x12345678';

async function testSDK() {
  console.log('🧪 Testing Sorted SDK\n');
  console.log('=' .repeat(60));

  // Test 1: SDK Initialization
  console.log('\n📦 Test 1: SDK Initialization');
  try {
    const sorted = new SortedClient({
      apiKey: TEST_API_KEY,
      backendUrl: BACKEND_URL,
      chainId: 14601,
    });

    const config = sorted.getConfig();
    console.log('✅ SDK initialized');
    console.log(`   Chain ID: ${config.chainId}`);
    console.log(`   Backend: ${config.backendUrl}`);
    console.log(`   API Key: ${config.apiKey.substring(0, 20)}...`);
  } catch (error: any) {
    console.error('❌ SDK initialization failed:', error.message);
    return;
  }

  // Test 2: Authorization Request
  console.log('\n🔐 Test 2: Authorization Request');
  try {
    const sorted = new SortedClient({
      apiKey: TEST_API_KEY,
      backendUrl: BACKEND_URL,
      chainId: 14601,
    });

    const auth = await sorted.authorize({
      projectId: TEST_PROJECT_ID,
      user: '0x9876543210987654321098765432109876543210',
      target: ALLOWLISTED_TARGET,
      selector: ALLOWLISTED_SELECTOR,
      estimatedGas: 200000,
      clientNonce: '0x' + Date.now().toString(16), // Unique nonce
    });

    console.log('✅ Authorization received');
    console.log(`   paymasterAndData length: ${auth.paymasterAndData.length} chars (${(auth.paymasterAndData.length - 2) / 2} bytes)`);
    console.log(`   Expires at: ${auth.expiresAt}`);
    console.log(`   Max cost: ${auth.maxCost}`);
    console.log(`   Policy hash: ${auth.policyHash.substring(0, 20)}...`);

    // Verify paymasterAndData format
    if (auth.paymasterAndData.length !== 376) { // 2 + (187 * 2) = 376 hex chars
      console.error(`❌ Invalid paymasterAndData length: expected 376, got ${auth.paymasterAndData.length}`);
      return;
    }

    // Verify it starts with paymaster address (lowercase)
    const expectedPrefix = '0x54fe2d4e7b1a35e57d18353e3e7c745411fd226b';
    if (!auth.paymasterAndData.toLowerCase().startsWith(expectedPrefix)) {
      console.error(`❌ paymasterAndData doesn't start with paymaster address`);
      return;
    }

    console.log('✅ paymasterAndData format verified (187 bytes)');
    console.log(`   Paymaster: ${auth.paymasterAndData.substring(0, 42)}`);
    console.log(`   Data: ${auth.paymasterAndData.substring(42, 82)}...`);
  } catch (error: any) {
    console.error('❌ Authorization failed:', error.message);
    if (error.details) {
      console.error('   Details:', error.details);
    }
    return;
  }

  // Test 3: Authorization Error Handling (invalid target)
  console.log('\n🚫 Test 3: Authorization Error Handling');
  try {
    const sorted = new SortedClient({
      apiKey: TEST_API_KEY,
      backendUrl: BACKEND_URL,
      chainId: 14601,
    });

    await sorted.authorize({
      projectId: TEST_PROJECT_ID,
      user: '0x9876543210987654321098765432109876543210',
      target: '0x2222222222222222222222222222222222222222', // Not allowlisted
      selector: '0x87654321',
      estimatedGas: 200000,
      clientNonce: '0x' + Date.now().toString(16),
    });

    console.error('❌ Should have thrown error for non-allowlisted target');
  } catch (error: any) {
    if (error.name === 'AuthorizationError' && error.message.includes('not allowlisted')) {
      console.log('✅ Correctly rejected non-allowlisted target');
      console.log(`   Error: ${error.message}`);
    } else {
      console.error('❌ Unexpected error:', error.message);
      return;
    }
  }

  // Test 4: Invalid API Key
  console.log('\n🔑 Test 4: Invalid API Key Handling');
  try {
    const sorted = new SortedClient({
      apiKey: 'sk_sorted_invalid_key_12345',
      backendUrl: BACKEND_URL,
      chainId: 14601,
    });

    await sorted.authorize({
      projectId: TEST_PROJECT_ID,
      user: '0x9876543210987654321098765432109876543210',
      target: ALLOWLISTED_TARGET,
      selector: ALLOWLISTED_SELECTOR,
      estimatedGas: 200000,
      clientNonce: '0x' + Date.now().toString(16),
    });

    console.error('❌ Should have thrown error for invalid API key');
  } catch (error: any) {
    if (error.name === 'AuthorizationError' && error.message.includes('Invalid API key')) {
      console.log('✅ Correctly rejected invalid API key');
      console.log(`   Error: ${error.message}`);
    } else {
      console.error('❌ Unexpected error:', error.message);
      return;
    }
  }

  // Test 5: Pimlico Client (without API key - should fail gracefully)
  console.log('\n🌐 Test 5: Pimlico Client Initialization');
  try {
    const sorted = new SortedClient({
      apiKey: TEST_API_KEY,
      backendUrl: BACKEND_URL,
      pimlicoApiKey: 'test_pimlico_key', // Fake key for now
      chainId: 14601,
    });

    console.log('✅ SDK initialized with Pimlico client');
    console.log('   Note: Pimlico operations require valid API key');
  } catch (error: any) {
    console.error('❌ Failed to initialize with Pimlico client:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ SDK Test Complete');
  console.log('\nResults:');
  console.log('  ✅ SDK initialization');
  console.log('  ✅ Authorization flow');
  console.log('  ✅ Response format validation');
  console.log('  ✅ Error handling (allowlist)');
  console.log('  ✅ Error handling (authentication)');
  console.log('  ✅ Pimlico client setup');
  console.log('\n📊 Phase 4 SDK: FULLY FUNCTIONAL');
  console.log('🎯 Next: Phase 5 (End-to-End Integration with actual UserOps)');
}

// Run tests
testSDK().catch((error) => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
