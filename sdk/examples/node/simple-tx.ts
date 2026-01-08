/**
 * Simple Example: Send a Gasless Transaction
 * Demonstrates basic SDK usage
 */

import { ethers } from 'ethers';
import { SortedClient } from '../../dist/index';

async function main() {
  // 1. Setup provider and account owner wallet
  const provider = new ethers.JsonRpcProvider('https://rpc.testnet.soniclabs.com');
  const accountOwner = new ethers.Wallet('YOUR_PRIVATE_KEY_HERE', provider);

  // 2. Initialize Sorted SDK
  const client = new SortedClient({
    apiKey: 'sk_sorted_your_api_key_here',
    backendUrl: 'http://localhost:3000',
    pimlicoApiKey: 'your_pimlico_api_key_here',
    chainId: 14601, // Sonic testnet
    provider,
  });

  // 3. Prepare your transaction
  const target = '0xYourContractAddress';
  const iface = new ethers.Interface(['function yourFunction()']);
  const callData = iface.encodeFunctionData('yourFunction');

  // 4. Send gasless transaction
  const receipt = await client.sendSponsoredTx({
    projectId: 'your-project-id',
    account: '0xYourSmartAccountAddress',
    accountSigner: accountOwner,
    target,
    selector: '0xYourFunctionSelector',
    data: callData,
  });

  console.log('Transaction confirmed!');
  console.log(`TX Hash: ${receipt.transactionHash}`);
  console.log(`Gas sponsored by paymaster: ${receipt.actualGasCost} wei`);
}

main();
