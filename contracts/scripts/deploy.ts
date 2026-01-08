import { ethers } from "hardhat";

/**
 * Deploy SortedPaymaster to Sonic testnet
 *
 * Requirements:
 * 1. DEPLOYER_PRIVATE_KEY in .env
 * 2. Deployer wallet funded with testnet S tokens
 * 3. BACKEND_SIGNER_ADDRESS in .env (or will use deployer address)
 */
async function main() {
  console.log("🚀 Starting SortedPaymaster deployment to Sonic testnet...\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(balance), "S\n");

  if (balance === 0n) {
    throw new Error("❌ Deployer has zero balance. Please fund the wallet with testnet tokens.");
  }

  // Constants
  const ENTRYPOINT_ADDRESS = "0x0000000071727de22e5e9d8baf0edac6f37da032"; // EntryPoint v0.7 on Sonic testnet
  const BACKEND_SIGNER_ADDRESS = process.env.BACKEND_SIGNER_ADDRESS || deployer.address;

  console.log("⚙️  Configuration:");
  console.log("   EntryPoint:", ENTRYPOINT_ADDRESS);
  console.log("   Backend Signer:", BACKEND_SIGNER_ADDRESS);
  console.log();

  // Deploy paymaster
  console.log("📝 Deploying SortedPaymaster contract...");
  const PaymasterFactory = await ethers.getContractFactory("SortedPaymaster");
  const paymaster = await PaymasterFactory.deploy(
    ENTRYPOINT_ADDRESS,
    BACKEND_SIGNER_ADDRESS
  );

  await paymaster.waitForDeployment();
  const paymasterAddress = await paymaster.getAddress();

  console.log("✅ SortedPaymaster deployed at:", paymasterAddress);
  console.log();

  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const entryPoint = await paymaster.ENTRY_POINT();
  const backendSigner = await paymaster.backendSigner();
  const owner = await paymaster.owner();

  console.log("   EntryPoint:", entryPoint);
  console.log("   Backend Signer:", backendSigner);
  console.log("   Owner:", owner);
  console.log();

  // Get default limits
  const maxCostPerUserOp = await paymaster.maxCostPerUserOp();
  const maxCallGasLimit = await paymaster.maxCallGasLimit();
  const maxVerificationGasLimit = await paymaster.maxVerificationGasLimit();

  console.log("📊 Default Limits:");
  console.log("   Max Cost Per UserOp:", ethers.formatEther(maxCostPerUserOp), "S");
  console.log("   Max Call Gas Limit:", maxCallGasLimit.toString());
  console.log("   Max Verification Gas Limit:", maxVerificationGasLimit.toString());
  console.log();

  // Fund paymaster (optional)
  const fundAmount = ethers.parseEther("0.1"); // 0.1 S for testing
  console.log("💸 Funding paymaster with", ethers.formatEther(fundAmount), "S...");

  const fundTx = await deployer.sendTransaction({
    to: paymasterAddress,
    value: fundAmount,
  });
  await fundTx.wait();

  const paymasterBalance = await ethers.provider.getBalance(paymasterAddress);
  console.log("✅ Paymaster balance:", ethers.formatEther(paymasterBalance), "S");
  console.log();

  // Deployment summary
  console.log("=" .repeat(60));
  console.log("🎉 Deployment Complete!");
  console.log("=" .repeat(60));
  console.log();
  console.log("📋 Deployment Summary:");
  console.log("   Network: Sonic Testnet (Chain ID: 14601)");
  console.log("   Paymaster Address:", paymasterAddress);
  console.log("   EntryPoint Address:", ENTRYPOINT_ADDRESS);
  console.log("   Backend Signer:", BACKEND_SIGNER_ADDRESS);
  console.log("   Owner:", owner);
  console.log("   Initial Funding:", ethers.formatEther(fundAmount), "S");
  console.log();
  console.log("🔗 Explorer:");
  console.log("   https://testnet.soniclabs.com/address/" + paymasterAddress);
  console.log();
  console.log("📝 Next Steps:");
  console.log("   1. Save the paymaster address to backend .env:");
  console.log(`      PAYMASTER_ADDRESS=${paymasterAddress}`);
  console.log("   2. Verify contract on explorer:");
  console.log(`      npx hardhat verify --network sonic ${paymasterAddress} "${ENTRYPOINT_ADDRESS}" "${BACKEND_SIGNER_ADDRESS}"`);
  console.log("   3. Configure allowlists for testing");
  console.log("   4. Proceed to Phase 3 (Backend Integration)");
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
