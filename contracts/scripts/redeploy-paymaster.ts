import { ethers } from 'hardhat';

async function main() {
  console.log('\n🔄 Redeploying SortedPaymaster with v0.7 paymasterAndData format\n');

  const ENTRY_POINT = process.env.ENTRYPOINT_ADDRESS || '0x0000000071727de22e5e9d8baf0edac6f37da032';
  const BACKEND_SIGNER = process.env.BACKEND_SIGNER_ADDRESS || '0x2577e25eBc6596eE9E05241a028b42EE4bffAD4f';

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`EntryPoint: ${ENTRY_POINT}`);
  console.log(`Backend Signer: ${BACKEND_SIGNER}\n`);

  // Deploy
  const SortedPaymaster = await ethers.getContractFactory('SortedPaymaster');
  const paymaster = await SortedPaymaster.deploy(ENTRY_POINT, BACKEND_SIGNER);
  await paymaster.waitForDeployment();

  const paymasterAddress = await paymaster.getAddress();
  console.log(`✅ SortedPaymaster deployed at: ${paymasterAddress}\n`);

  // Update .env
  console.log('📝 Update your .env files with:');
  console.log(`PAYMASTER_ADDRESS=${paymasterAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
