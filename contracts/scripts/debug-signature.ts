import { ethers } from 'hardhat';
import axios from 'axios';

async function main() {
  const SIMPLE_ACCOUNT = '0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506';
  const TEST_COUNTER = '0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3';
  const INCREMENT_SELECTOR = '0xd09de08a';
  const PAYMASTER = '0xB3034d28A4e374aad345756145c9EbCA0CC7584e';
  const BACKEND_SIGNER_PRIVATE_KEY = '0x640216c8915f4ae34c17481fdc16e306c289eed8040b49ef241c061abd6a6253';

  console.log('\n=== Signature Debugging ===\n');

  // Request authorization from backend
  const response = await axios.post('http://localhost:3000/sponsor/authorize', {
    projectId: 'test-game',
    user: SIMPLE_ACCOUNT,
    target: TEST_COUNTER,
    selector: INCREMENT_SELECTOR,
    estimatedGas: 200000,
    clientNonce: '0x0',
    chainId: 14601,
  }, {
    headers: {
      Authorization: 'Bearer sk_sorted_1b890bd4d0f369277cef4638decaf927de01ddd3276c1f3806be9b46f0147092',
    },
  });

  console.log('Backend response:');
  console.log(`  paymasterAndData length: ${response.data.paymasterAndData.length} chars (${(response.data.paymasterAndData.length - 2) / 2} bytes)`);
  console.log(`  paymasterAndData: ${response.data.paymasterAndData.slice(0, 66)}...`);

  // Parse paymasterAndData
  const paymasterAndData = response.data.paymasterAndData;

  // Layout:
  // 0-19: paymaster address (20 bytes = 40 hex chars)
  // 20-25: expiry (6 bytes = 12 hex chars)
  // 26-57: maxCost (32 bytes = 64 hex chars)
  // 58-89: policyHash (32 bytes = 64 hex chars)
  // 90-121: projectId (32 bytes = 64 hex chars)
  // 122-186: signature (65 bytes = 130 hex chars)

  const paymaster = '0x' + paymasterAndData.slice(2, 42);
  const expiry = '0x' + paymasterAndData.slice(42, 54);
  const maxCost = '0x' + paymasterAndData.slice(54, 118);
  const policyHash = '0x' + paymasterAndData.slice(118, 182);
  const projectId = '0x' + paymasterAndData.slice(182, 246);
  const signature = '0x' + paymasterAndData.slice(246, 376);

  console.log('\nParsed paymasterAndData:');
  console.log(`  Paymaster: ${paymaster}`);
  console.log(`  Expiry: ${expiry} (${parseInt(expiry, 16)})`);
  console.log(`  Max Cost: ${maxCost}`);
  console.log(`  Policy Hash: ${policyHash}`);
  console.log(`  Project ID: ${projectId}`);
  console.log(`  Signature: ${signature.slice(0, 20)}...`);

  // Verify the signature locally
  const wallet = new ethers.Wallet(BACKEND_SIGNER_PRIVATE_KEY);

  // Recreate the hash that should have been signed
  const nonce = 0;
  const chainId = 14601;

  const hash = ethers.keccak256(
    ethers.solidityPacked(
      ['address', 'uint256', 'uint48', 'uint256', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        SIMPLE_ACCOUNT,
        nonce,
        parseInt(expiry, 16),
        maxCost,
        policyHash,
        projectId,
        chainId,
        PAYMASTER,
      ]
    )
  );

  console.log(`\nHash to sign: ${hash}`);

  // Recover signer from signature
  const messageHash = ethers.hashMessage(ethers.getBytes(hash));
  console.log(`Message hash (with prefix): ${messageHash}`);

  try {
    const recoveredAddress = ethers.recoverAddress(messageHash, signature);
    console.log(`\nRecovered signer: ${recoveredAddress}`);
    console.log(`Expected signer: ${wallet.address}`);

    if (recoveredAddress.toLowerCase() === wallet.address.toLowerCase()) {
      console.log('✅ Signature VALID');
    } else {
      console.log('❌ Signature INVALID - signer mismatch');
    }
  } catch (e: any) {
    console.log(`❌ Signature recovery failed: ${e.message}`);
  }

  // Also check the paymasterAndData byte length
  const expectedLength = 2 + (20 + 6 + 32 + 32 + 32 + 65) * 2; // 0x + 187 bytes * 2 hex chars
  console.log(`\nExpected paymasterAndData length: ${expectedLength} chars`);
  console.log(`Actual paymasterAndData length: ${paymasterAndData.length} chars`);

  if (paymasterAndData.length === expectedLength) {
    console.log('✅ Length correct');
  } else {
    console.log(`❌ Length mismatch by ${paymasterAndData.length - expectedLength} chars (${(paymasterAndData.length - expectedLength) / 2} bytes)`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
