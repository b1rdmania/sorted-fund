import { ethers } from 'hardhat';

async function main() {
  const PAYMASTER = '0xB3034d28A4e374aad345756145c9EbCA0CC7584e';
  const TEST_COUNTER = '0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3';
  const INCREMENT_SELECTOR = '0xd09de08a';

  console.log('\n=== Checking Paymaster Allowlist ===\n');

  const paymaster = await ethers.getContractAt('SortedPaymaster', PAYMASTER);

  // Check allowlist
  const isAllowed = await paymaster.allowlist(TEST_COUNTER, INCREMENT_SELECTOR);
  console.log(`Target: ${TEST_COUNTER}`);
  console.log(`Selector: ${INCREMENT_SELECTOR}`);
  console.log(`Allowlisted: ${isAllowed ? '✅ YES' : '❌ NO'}`);

  // Check other paymaster settings
  const backendSigner = await paymaster.backendSigner();
  const globalKillSwitch = await paymaster.globalKillSwitch();
  const maxCostPerUserOp = await paymaster.maxCostPerUserOp();
  const maxCallGasLimit = await paymaster.maxCallGasLimit();
  const maxVerificationGasLimit = await paymaster.maxVerificationGasLimit();

  console.log(`\nBackend Signer: ${backendSigner}`);
  console.log(`Global Kill Switch: ${globalKillSwitch ? '❌ ACTIVE' : '✅ Inactive'}`);
  console.log(`Max Cost Per UserOp: ${ethers.formatEther(maxCostPerUserOp)} S`);
  console.log(`Max Call Gas Limit: ${maxCallGasLimit}`);
  console.log(`Max Verification Gas Limit: ${maxVerificationGasLimit}`);

  // Decode the error if possible
  console.log('\n=== Error Analysis ===\n');
  const errorData = '0xd78bce0c898f93c3557e4eb948078dc2e43e2d600b63c66fe0b3c1018401497298af2825';
  const errorSelector = errorData.slice(0, 10);
  console.log(`Error selector: ${errorSelector}`);

  // Try to match against known errors
  const errors = {
    'TargetNotAllowlisted': ethers.id('TargetNotAllowlisted(address,bytes4)').slice(0, 10),
    'InvalidSignature': ethers.id('InvalidSignature()').slice(0, 10),
    'SignatureExpired': ethers.id('SignatureExpired(uint48,uint48)').slice(0, 10),
    'MaxCostExceeded': ethers.id('MaxCostExceeded(uint256,uint256)').slice(0, 10),
    'CallGasLimitExceeded': ethers.id('CallGasLimitExceeded(uint256,uint256)').slice(0, 10),
    'VerificationGasLimitExceeded': ethers.id('VerificationGasLimitExceeded(uint256,uint256)').slice(0, 10),
  };

  for (const [name, selector] of Object.entries(errors)) {
    if (selector === errorSelector) {
      console.log(`Matched error: ${name}`);
      if (name === 'TargetNotAllowlisted') {
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
          ['address', 'bytes4'],
          '0x' + errorData.slice(10)
        );
        console.log(`  Target: ${decoded[0]}`);
        console.log(`  Selector: ${decoded[1]}`);
      }
      break;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
