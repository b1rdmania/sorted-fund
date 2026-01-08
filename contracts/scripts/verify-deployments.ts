import { ethers } from 'hardhat';

async function main() {
  console.log('🔍 Verifying Phase 5 Deployments\n');

  const simpleAccountAddr = '0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506';
  const testCounterAddr = '0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3';

  // Check SimpleAccount
  console.log('SimpleAccount:');
  const saCode = await ethers.provider.getCode(simpleAccountAddr);
  console.log(`  Code size: ${(saCode.length - 2) / 2} bytes`);
  const saBalance = await ethers.provider.getBalance(simpleAccountAddr);
  console.log(`  Balance: ${ethers.formatEther(saBalance)} S`);

  const sa = await ethers.getContractAt('SimpleAccount', simpleAccountAddr);
  const owner = await sa.owner();
  console.log(`  Owner: ${owner}`);
  const deposit = await sa.getDeposit();
  console.log(`  EntryPoint deposit: ${ethers.formatEther(deposit)} S`);
  const nonce = await sa.getNonce();
  console.log(`  Nonce: ${nonce}`);

  // Check TestCounter
  console.log('\nTestCounter:');
  const tcCode = await ethers.provider.getCode(testCounterAddr);
  console.log(`  Code size: ${(tcCode.length - 2) / 2} bytes`);

  const tc = await ethers.getContractAt('TestCounter', testCounterAddr);
  const counter = await tc.getCounter(simpleAccountAddr);
  console.log(`  Counter for SimpleAccount: ${counter}`);

  console.log('\n✅ All contracts deployed and accessible!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
