import { ethers } from 'hardhat';
import axios from 'axios';

async function main() {
  const SIMPLE_ACCOUNT = '0x4BEfFA7558375a0f8e55a4eABbE9a53F661E5506';
  const TEST_COUNTER = '0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3';
  const INCREMENT_SELECTOR = '0xd09de08a';
  const PAYMASTER = process.env.PAYMASTER_ADDRESS || '0x96802bD321315aEbf7595eB3E558278E1DD5beA7';
  const BACKEND_SIGNER_PRIVATE_KEY = '0x640216c8915f4ae34c17481fdc16e306c289eed8040b49ef241c061abd6a6253';

  console.log('\n=== Manual Signature Verification ===\n');

  // Get nonce
  const simpleAccount = await ethers.getContractAt('SimpleAccount', SIMPLE_ACCOUNT);
  const nonce = await simpleAccount.getNonce();
  console.log(`Account nonce: ${nonce}`);

  // Request authorization
  const response = await axios.post('http://localhost:3000/sponsor/authorize', {
    projectId: 'test-game',
    user: SIMPLE_ACCOUNT,
    target: TEST_COUNTER,
    selector: INCREMENT_SELECTOR,
    estimatedGas: 200000,
    clientNonce: '0x' + nonce.toString(16),
    chainId: 14601,
  }, {
    headers: {
      Authorization: 'Bearer sk_sorted_1b890bd4d0f369277cef4638decaf927de01ddd3276c1f3806be9b46f0147092',
    },
  });

  const paymasterAndData = response.data.paymasterAndData;
  console.log(`\nPaymasterAndData length: ${paymasterAndData.length} chars (${(paymasterAndData.length - 2) / 2} bytes)`);

  // Parse paymasterAndData (219 bytes total)
  // 0-19: paymaster (20 bytes = 40 hex)
  // 20-35: verificationGasLimit (16 bytes = 32 hex)
  // 36-51: postOpGasLimit (16 bytes = 32 hex)
  // 52-57: expiry (6 bytes = 12 hex)
  // 58-89: maxCost (32 bytes = 64 hex)
  // 90-121: policyHash (32 bytes = 64 hex)
  // 122-153: projectId (32 bytes = 64 hex)
  // 154-218: signature (65 bytes = 130 hex)

  const paymaster = '0x' + paymasterAndData.slice(2, 42);
  const verificationGasLimit = '0x' + paymasterAndData.slice(42, 74);
  const postOpGasLimit = '0x' + paymasterAndData.slice(74, 106);
  const expiry = '0x' + paymasterAndData.slice(106, 118);
  const maxCost = '0x' + paymasterAndData.slice(118, 182);
  const policyHash = '0x' + paymasterAndData.slice(182, 246);
  const projectId = '0x' + paymasterAndData.slice(246, 310);
  const signature = '0x' + paymasterAndData.slice(310, 440);

  console.log('\nParsed paymasterAndData:');
  console.log(`  Paymaster: ${paymaster}`);
  console.log(`  Verification Gas Limit: ${verificationGasLimit} (${parseInt(verificationGasLimit, 16)})`);
  console.log(`  Post-Op Gas Limit: ${postOpGasLimit} (${parseInt(postOpGasLimit, 16)})`);
  const expiryTimestamp = parseInt(expiry, 16);
  console.log(`  Expiry: ${expiry} (${expiryTimestamp})`);
  console.log(`  Max Cost: ${maxCost}`);
  console.log(`  Policy Hash: ${policyHash}`);
  console.log(`  Project ID: ${projectId}`);
  console.log(`  Signature length: ${signature.length} chars`);

  // Recreate the hash that was signed
  const hash = ethers.keccak256(
    ethers.solidityPacked(
      ['address', 'uint256', 'uint48', 'uint256', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        SIMPLE_ACCOUNT,  // sender
        nonce,           // nonce
        parseInt(expiry, 16),  // expiry
        maxCost,         // maxCost
        policyHash,      // policyHash
        projectId,       // projectId
        14601,           // chainId
        paymaster,       // paymaster address
      ]
    )
  );

  console.log(`\nHash to sign: ${hash}`);

  // Verify signature
  const messageHash = ethers.hashMessage(ethers.getBytes(hash));
  console.log(`Message hash (with prefix): ${messageHash}`);

  const wallet = new ethers.Wallet(BACKEND_SIGNER_PRIVATE_KEY);
  console.log(`Expected signer: ${wallet.address}`);

  try {
    const recoveredAddress = ethers.recoverAddress(messageHash, signature);
    console.log(`Recovered signer: ${recoveredAddress}`);

    if (recoveredAddress.toLowerCase() === wallet.address.toLowerCase()) {
      console.log('\n✅ Signature is VALID!');
    } else {
      console.log('\n❌ Signature is INVALID - signer mismatch!');
    }
  } catch (e: any) {
    console.log(`\n❌ Signature recovery failed: ${e.message}`);
  }

  // Also check what paymaster expects
  const paymasterContract = await ethers.getContractAt('SortedPaymaster', paymaster);
  const backendSigner = await paymasterContract.backendSigner();
  console.log(`\nPaymaster expects signer: ${backendSigner}`);

  if (backendSigner.toLowerCase() === wallet.address.toLowerCase()) {
    console.log('✅ Backend signer matches paymaster configuration');
  } else {
    console.log('❌ Backend signer DOES NOT match paymaster configuration');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
