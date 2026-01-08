import { ethers } from 'hardhat';

async function main() {
  console.log('💰 Funding Paymaster in EntryPoint\n');

  const paymasterAddr = process.env.PAYMASTER_ADDRESS || '0xB3034d28A4e374aad345756145c9EbCA0CC7584e';
  const entryPointAddr = process.env.ENTRYPOINT_ADDRESS || '0x0000000071727de22e5e9d8baf0edac6f37da032';

  console.log(`Paymaster: ${paymasterAddr}`);
  console.log(`EntryPoint: ${entryPointAddr}\n`);

  const [deployer] = await ethers.getSigners();

  // Check current deposit
  const entryPoint = await ethers.getContractAt('@account-abstraction/contracts/interfaces/IEntryPoint.sol:IEntryPoint', entryPointAddr);
  const depositBefore = await entryPoint.balanceOf(paymasterAddr);
  console.log(`Current paymaster deposit: ${ethers.formatEther(depositBefore)} S`);

  // Deposit more funds
  const depositAmount = ethers.parseEther('0.5'); // 0.5 S for testing
  console.log(`\nDepositing ${ethers.formatEther(depositAmount)} S to paymaster...`);

  const tx = await entryPoint.depositTo(paymasterAddr, { value: depositAmount });
  await tx.wait();
  console.log(`✅ Transaction confirmed: ${tx.hash}`);

  // Check new deposit
  const depositAfter = await entryPoint.balanceOf(paymasterAddr);
  console.log(`\nNew paymaster deposit: ${ethers.formatEther(depositAfter)} S`);
  console.log('✅ Paymaster ready to sponsor transactions!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
