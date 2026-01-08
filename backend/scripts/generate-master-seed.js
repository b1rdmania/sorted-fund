/**
 * Generate Master Seed for HD Wallet
 * Creates a secure 12-word BIP-39 mnemonic for project deposit addresses
 */

const { ethers } = require('ethers');

console.log('=== Generating Master Seed for HD Wallet ===\n');

// Generate random mnemonic
const wallet = ethers.Wallet.createRandom();
const mnemonic = wallet.mnemonic.phrase;

console.log('🔐 Master Mnemonic (KEEP SECRET!):');
console.log(mnemonic);
console.log();

// Show first 3 derived addresses as examples
console.log('Example derived addresses:');
const hdNode = ethers.HDNodeWallet.fromMnemonic(wallet.mnemonic);

for (let i = 0; i < 3; i++) {
  const derived = hdNode.derivePath(`44'/60'/0'/0/${i}`);
  console.log(`  Project ${i}: ${derived.address}`);
}

console.log();
console.log('⚠️  SECURITY WARNING:');
console.log('  - Store this mnemonic in a secure location');
console.log('  - Never commit it to git');
console.log('  - Add to backend/.env as MASTER_MNEMONIC');
console.log('  - Losing this mnemonic means losing access to all deposit addresses');
console.log();
