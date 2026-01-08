import { ethers } from 'hardhat';

async function main() {
  const TEST_COUNTER = '0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3';
  const SIMPLE_ACCOUNT = '0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506';

  const testCounter = await ethers.getContractAt('TestCounter', TEST_COUNTER);
  const simpleAccount = await ethers.getContractAt('SimpleAccount', SIMPLE_ACCOUNT);

  // Build increment callData
  const incrementCallData = testCounter.interface.encodeFunctionData('increment', []);
  console.log(`\nIncrement callData: ${incrementCallData}`);
  console.log(`Length: ${incrementCallData.length} chars (${(incrementCallData.length - 2) / 2} bytes)`);

  // Build execute callData
  const executeCallData = simpleAccount.interface.encodeFunctionData('execute', [
    TEST_COUNTER,
    0,
    incrementCallData,
  ]);

  console.log(`\nExecute callData: ${executeCallData}`);
  console.log(`Length: ${executeCallData.length} chars (${(executeCallData.length - 2) / 2} bytes)`);

  // Parse the execute callData manually
  console.log('\nParsing execute callData:');
  console.log(`  Selector (bytes 0-3): ${executeCallData.slice(0, 10)}`);
  console.log(`  Target (bytes 4-35): 0x${executeCallData.slice(10, 74)}`);
  console.log(`    -> Address: 0x${executeCallData.slice(34, 74)}`);
  console.log(`  Value (bytes 36-67): 0x${executeCallData.slice(74, 138)}`);
  console.log(`  Data offset (bytes 68-99): 0x${executeCallData.slice(138, 202)}`);

  // The data offset tells us where the dynamic bytes data starts
  const dataOffset = parseInt('0x' + executeCallData.slice(138, 202), 16);
  console.log(`  Data offset value: ${dataOffset}`);

  // At the offset, we have: length (32 bytes) + actual data
  const dataStart = 2 + dataOffset * 2; // 2 for '0x', dataOffset in hex chars
  const dataLengthHex = executeCallData.slice(dataStart, dataStart + 64);
  const dataLength = parseInt('0x' + dataLengthHex, 16);
  console.log(`  Data length (at byte ${dataOffset}): ${dataLength} bytes`);

  const actualDataStart = dataStart + 64;
  const actualData = '0x' + executeCallData.slice(actualDataStart, actualDataStart + dataLength * 2);
  console.log(`  Actual data (at byte ${dataOffset + 32}): ${actualData}`);
  console.log(`  Inner selector: ${actualData.slice(0, 10)}`);

  // This is what the paymaster should extract
  console.log('\n✅ Paymaster should extract:');
  console.log(`  Target: 0x${executeCallData.slice(34, 74)}`);
  console.log(`  Selector: ${actualData.slice(0, 10)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
