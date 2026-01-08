import { ethers } from 'hardhat';

async function main() {
  const PAYMASTER = process.env.PAYMASTER_ADDRESS || '0xB3034d28A4e374aad345756145c9EbCA0CC7584e';
  const TEST_COUNTER = process.env.TEST_COUNTER_ADDRESS || '0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3';
  const INCREMENT_SELECTOR = process.env.INCREMENT_SELECTOR || '0xd09de08a';

  console.log('\n📋 Adding to Paymaster Allowlist\n');
  console.log(`Paymaster: ${PAYMASTER}`);
  console.log(`Target: ${TEST_COUNTER}`);
  console.log(`Selector: ${INCREMENT_SELECTOR}\n`);

  const [deployer] = await ethers.getSigners();
  const paymaster = await ethers.getContractAt('SortedPaymaster', PAYMASTER);

  // Check if already allowlisted
  const isAllowed = await paymaster.allowlist(TEST_COUNTER, INCREMENT_SELECTOR);
  if (isAllowed) {
    console.log('✅ Already allowlisted!');
    return;
  }

  // Add to allowlist
  console.log('Adding to allowlist...');
  const tx = await paymaster.setAllowlist(TEST_COUNTER, INCREMENT_SELECTOR, true);
  await tx.wait();
  console.log(`✅ Transaction confirmed: ${tx.hash}`);

  // Verify
  const isNowAllowed = await paymaster.allowlist(TEST_COUNTER, INCREMENT_SELECTOR);
  console.log(`\nVerification: ${isNowAllowed ? '✅ Allowlisted' : '❌ Failed'}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
