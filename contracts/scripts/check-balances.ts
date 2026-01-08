import { ethers } from 'hardhat';

async function main() {
  const SIMPLE_ACCOUNT = '0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506';
  const PAYMASTER = '0xB3034d28A4e374aad345756145c9EbCA0CC7584e';
  const ENTRYPOINT_V07 = '0x0000000071727de22e5e9d8baf0edac6f37da032';
  const ENTRYPOINT_V06 = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

  console.log('\n=== Account Balances ===');

  // SimpleAccount balance
  const accountBalance = await ethers.provider.getBalance(SIMPLE_ACCOUNT);
  console.log(`SimpleAccount: ${ethers.formatEther(accountBalance)} S`);

  // Paymaster balance
  const paymasterBalance = await ethers.provider.getBalance(PAYMASTER);
  console.log(`Paymaster: ${ethers.formatEther(paymasterBalance)} S`);

  console.log('\n=== EntryPoint Deposits ===');

  // Check v0.7 deposits
  try {
    const entryPointV07 = await ethers.getContractAt(
      ['function balanceOf(address) view returns (uint256)'],
      ENTRYPOINT_V07
    );
    const paymasterDepositV07 = await entryPointV07.balanceOf(PAYMASTER);
    console.log(`Paymaster deposit (v0.7): ${ethers.formatEther(paymasterDepositV07)} S`);
  } catch (e: any) {
    console.log(`v0.7 EntryPoint check failed: ${e.message}`);
  }

  // Check v0.6 deposits
  try {
    const entryPointV06 = await ethers.getContractAt(
      ['function balanceOf(address) view returns (uint256)'],
      ENTRYPOINT_V06
    );
    const paymasterDepositV06 = await entryPointV06.balanceOf(PAYMASTER);
    console.log(`Paymaster deposit (v0.6): ${ethers.formatEther(paymasterDepositV06)} S`);
  } catch (e: any) {
    console.log(`v0.6 EntryPoint check failed: ${e.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
