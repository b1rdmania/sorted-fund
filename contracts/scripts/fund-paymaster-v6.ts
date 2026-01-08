import { ethers } from 'hardhat';

async function main() {
  console.log('💰 Funding Paymaster in EntryPoint v0.6\n');

  const paymasterAddr = '0xEccbA8B7B26EA865FcfF2B3eD02b6e39aa0DE1aD';
  const entryPointV6Addr = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

  const [deployer] = await ethers.getSigners();

  // Check current deposit
  const entryPoint = await ethers.getContractAt('@account-abstraction/contracts/interfaces/IEntryPoint.sol:IEntryPoint', entryPointV6Addr);
  const depositBefore = await entryPoint.balanceOf(paymasterAddr);
  console.log(`Current paymaster deposit in v0.6: ${ethers.formatEther(depositBefore)} S`);

  // Deposit funds
  const depositAmount = ethers.parseEther('0.15');
  console.log(`\nDepositing ${ethers.formatEther(depositAmount)} S to paymaster (v0.6)...`);

  const tx = await entryPoint.depositTo(paymasterAddr, { value: depositAmount });
  await tx.wait();
  console.log(`✅ Transaction confirmed: ${tx.hash}`);

  // Check new deposit
  const depositAfter = await entryPoint.balanceOf(paymasterAddr);
  console.log(`\nNew paymaster deposit in v0.6: ${ethers.formatEther(depositAfter)} S`);
  console.log('✅ Paymaster ready to sponsor transactions on v0.6!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
