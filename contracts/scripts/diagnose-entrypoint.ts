import { ethers } from 'hardhat';

async function main() {
  console.log('🔍 Diagnosing EntryPoint Compatibility\n');

  const entryPointV7Addr = '0x0000000071727de22e5e9d8baf0edac6f37da032';
  const entryPointV6Addr = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

  // Check v0.7
  console.log('Checking EntryPoint v0.7:', entryPointV7Addr);
  const codeV7 = await ethers.provider.getCode(entryPointV7Addr);
  console.log(`  Code size: ${(codeV7.length - 2) / 2} bytes`);
  console.log(`  Deployed: ${codeV7 !== '0x' ? 'YES ✅' : 'NO ❌'}`);

  // Check v0.6
  console.log('\nChecking EntryPoint v0.6:', entryPointV6Addr);
  const codeV6 = await ethers.provider.getCode(entryPointV6Addr);
  console.log(`  Code size: ${(codeV6.length - 2) / 2} bytes`);
  console.log(`  Deployed: ${codeV6 !== '0x' ? 'YES ✅' : 'NO ❌'}`);

  // Check paymaster deposit in both
  if (codeV7 !== '0x') {
    const entryPointV7 = await ethers.getContractAt('@account-abstraction/contracts/interfaces/IEntryPoint.sol:IEntryPoint', entryPointV7Addr);
    const paymasterAddr = '0x54fE2D4e7B1A35e57d18353e3E7C745411fd226b';
    const deposit = await entryPointV7.balanceOf(paymasterAddr);
    console.log(`\n  Paymaster deposit in v0.7: ${ethers.formatEther(deposit)} S`);
  }

  console.log('\n📝 Conclusion:');
  if (codeV7 !== '0x' && codeV6 === '0x') {
    console.log('  Sonic testnet has EntryPoint v0.7 only');
    console.log('  Pimlico should support v0.7 format');
  } else if (codeV6 !== '0x' && codeV7 === '0x') {
    console.log('  Sonic testnet has EntryPoint v0.6 only');
    console.log('  ⚠️  Our contracts are built for v0.7 - INCOMPATIBLE!');
  } else if (codeV6 !== '0x' && codeV7 !== '0x') {
    console.log('  Sonic testnet has BOTH v0.6 and v0.7');
    console.log('  Need to configure Pimlico to use correct version');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
