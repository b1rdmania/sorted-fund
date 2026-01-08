import { ethers } from 'hardhat';

async function main() {
  const PAYMASTER = process.env.PAYMASTER_ADDRESS || '0x96802bD321315aEbf7595eB3E558278E1DD5beA7';
  const errorData = process.argv[2] || '0xf645eedf';

  console.log('\n=== Error Decoding ===\n');
  console.log(`Error data: ${errorData}`);

  const errorSelector = errorData.slice(0, 10);
  console.log(`Selector: ${errorSelector}`);

  // Calculate all error selectors
  const errors: Record<string, { selector: string; params: string[] }> = {
    'OnlyEntryPoint': {
      selector: ethers.id('OnlyEntryPoint()').slice(0, 10),
      params: [],
    },
    'GlobalKillSwitchActive': {
      selector: ethers.id('GlobalKillSwitchActive()').slice(0, 10),
      params: [],
    },
    'ProjectKillSwitchActive': {
      selector: ethers.id('ProjectKillSwitchActive(bytes32)').slice(0, 10),
      params: ['bytes32'],
    },
    'InvalidSignature': {
      selector: ethers.id('InvalidSignature()').slice(0, 10),
      params: [],
    },
    'SignatureExpired': {
      selector: ethers.id('SignatureExpired(uint48,uint48)').slice(0, 10),
      params: ['uint48', 'uint48'],
    },
    'MaxCostExceeded': {
      selector: ethers.id('MaxCostExceeded(uint256,uint256)').slice(0, 10),
      params: ['uint256', 'uint256'],
    },
    'CallGasLimitExceeded': {
      selector: ethers.id('CallGasLimitExceeded(uint256,uint256)').slice(0, 10),
      params: ['uint256', 'uint256'],
    },
    'VerificationGasLimitExceeded': {
      selector: ethers.id('VerificationGasLimitExceeded(uint256,uint256)').slice(0, 10),
      params: ['uint256', 'uint256'],
    },
    'TargetNotAllowlisted': {
      selector: ethers.id('TargetNotAllowlisted(address,bytes4)').slice(0, 10),
      params: ['address', 'bytes4'],
    },
    'InvalidBackendSigner': {
      selector: ethers.id('InvalidBackendSigner()').slice(0, 10),
      params: [],
    },
  };

  console.log('\nKnown error selectors:');
  for (const [name, { selector }] of Object.entries(errors)) {
    console.log(`  ${name}: ${selector}`);
  }

  // Find match
  let matched = false;
  for (const [name, { selector, params }] of Object.entries(errors)) {
    if (selector === errorSelector) {
      console.log(`\n✅ Matched: ${name}`);
      matched = true;

      if (params.length > 0) {
        try {
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
            params,
            '0x' + errorData.slice(10)
          );
          console.log(`Parameters:`);
          params.forEach((param, i) => {
            console.log(`  ${param}: ${decoded[i]}`);
          });

          if (name === 'ProjectKillSwitchActive') {
            const projectId = decoded[0];
            console.log(`\n🔍 Checking if project kill switch is active...`);
            const paymaster = await ethers.getContractAt('SortedPaymaster', PAYMASTER);
            const isActive = await paymaster.projectKillSwitch(projectId);
            console.log(`Kill switch for project ${projectId}: ${isActive ? '❌ ACTIVE' : '✅ Inactive'}`);
          }
        } catch (e: any) {
          console.log(`  (Failed to decode parameters: ${e.message})`);
        }
      }
      break;
    }
  }

  if (!matched) {
    console.log(`\n❌ Unknown error selector`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
