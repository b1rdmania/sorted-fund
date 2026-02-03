import { ethers } from 'hardhat';

async function main() {
  const PAYMASTER = '0xB3034d28A4e374aad345756145c9EbCA0CC7584e';

  const BACKEND_SIGNER_PRIVATE_KEY = process.env.BACKEND_SIGNER_PRIVATE_KEY;
  if (!BACKEND_SIGNER_PRIVATE_KEY) {
    throw new Error('BACKEND_SIGNER_PRIVATE_KEY is required');
  }

  console.log('\n=== Backend Signer Verification ===\n');

  // Derive address from private key
  const wallet = new ethers.Wallet(BACKEND_SIGNER_PRIVATE_KEY);
  const derivedAddress = wallet.address;
  console.log(`Backend private key derives to: ${derivedAddress}`);

  // Check what's configured on paymaster
  const paymaster = await ethers.getContractAt('SortedPaymaster', PAYMASTER);
  const configuredSigner = await paymaster.backendSigner();
  console.log(`Paymaster expects signer:      ${configuredSigner}`);

  if (derivedAddress.toLowerCase() === configuredSigner.toLowerCase()) {
    console.log('\n✅ Signers MATCH');
  } else {
    console.log('\n❌ Signers DO NOT MATCH - This is the problem!');
    console.log('\nTo fix, run:');
    console.log(`paymaster.setBackendSigner("${derivedAddress}")`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
