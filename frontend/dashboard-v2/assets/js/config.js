/**
 * Sorted.fund Dashboard V2 - Configuration
 */

const CONFIG = {
  // Backend API
  API_BASE_URL: 'http://localhost:3000',

  // Default project (single project mode for demo)
  DEFAULT_PROJECT_ID: 'test-game',

  // Auto-refresh intervals
  BALANCE_REFRESH_INTERVAL: 15000,  // 15 seconds
  METRICS_REFRESH_INTERVAL: 30000,   // 30 seconds

  // Blockchain
  CHAIN_ID: 14601,
  CHAIN_NAME: 'Sonic Testnet',
  RPC_URL: 'https://rpc.testnet.soniclabs.com',
  EXPLORER_URL: 'https://testnet.soniclabs.com',

  // Contracts
  ENTRYPOINT_ADDRESS: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  PAYMASTER_ADDRESS: '0x41B35AAD2e3F8c36ad883c354AEa828a2100Bb4a',

  // Test contracts
  TEST_COUNTER_ADDRESS: '0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3',
  TEST_ACCOUNT_ADDRESS: '0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506',
};

// Export for use in HTML pages
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
