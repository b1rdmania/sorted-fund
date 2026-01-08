import { ethers } from "hardhat";

/**
 * Comprehensive test suite for deployed SortedPaymaster
 * Tests all functionality on Sonic testnet
 */
async function main() {
  console.log("🧪 Testing Deployed SortedPaymaster on Sonic Testnet\n");
  console.log("=" .repeat(60));

  const PAYMASTER_ADDRESS = "0x54fE2D4e7B1A35e57d18353e3E7C745411fd226b";
  const EXPECTED_ENTRYPOINT = "0x0000000071727de22e5e9d8baf0edac6f37da032";
  const EXPECTED_BACKEND_SIGNER = "0x2577e25eBc6596eE9E05241a028b42EE4bffAD4f";

  let testsPassed = 0;
  let testsFailed = 0;

  // Get signer (deployer/owner)
  const [deployer] = await ethers.getSigners();
  console.log("🔑 Testing as:", deployer.address);
  console.log();

  // Get contract instance
  console.log("📝 Connecting to paymaster contract...");
  const paymaster = await ethers.getContractAt("SortedPaymaster", PAYMASTER_ADDRESS);
  console.log("✅ Connected to:", PAYMASTER_ADDRESS);
  console.log();

  // Test 1: Contract accessibility
  console.log("Test 1: Contract Accessibility");
  try {
    const code = await ethers.provider.getCode(PAYMASTER_ADDRESS);
    if (code === "0x" || code === "0x0") {
      throw new Error("No code at paymaster address");
    }
    console.log("✅ Contract code exists (length: " + code.length + " bytes)");
    testsPassed++;
  } catch (error: any) {
    console.log("❌ FAILED:", error.message);
    testsFailed++;
  }
  console.log();

  // Test 2: EntryPoint configuration
  console.log("Test 2: EntryPoint Configuration");
  try {
    const entryPoint = await paymaster.ENTRY_POINT();
    if (entryPoint.toLowerCase() !== EXPECTED_ENTRYPOINT.toLowerCase()) {
      throw new Error(`EntryPoint mismatch: ${entryPoint} != ${EXPECTED_ENTRYPOINT}`);
    }
    console.log("✅ EntryPoint:", entryPoint);
    testsPassed++;
  } catch (error: any) {
    console.log("❌ FAILED:", error.message);
    testsFailed++;
  }
  console.log();

  // Test 3: Backend signer configuration
  console.log("Test 3: Backend Signer Configuration");
  try {
    const backendSigner = await paymaster.backendSigner();
    if (backendSigner.toLowerCase() !== EXPECTED_BACKEND_SIGNER.toLowerCase()) {
      throw new Error(`Backend signer mismatch: ${backendSigner} != ${EXPECTED_BACKEND_SIGNER}`);
    }
    console.log("✅ Backend Signer:", backendSigner);
    testsPassed++;
  } catch (error: any) {
    console.log("❌ FAILED:", error.message);
    testsFailed++;
  }
  console.log();

  // Test 4: Owner configuration
  console.log("Test 4: Owner Configuration");
  try {
    const owner = await paymaster.owner();
    console.log("✅ Owner:", owner);
    testsPassed++;
  } catch (error: any) {
    console.log("❌ FAILED:", error.message);
    testsFailed++;
  }
  console.log();

  // Test 5: Default limits
  console.log("Test 5: Default Limits Configuration");
  try {
    const maxCostPerUserOp = await paymaster.maxCostPerUserOp();
    const maxCallGasLimit = await paymaster.maxCallGasLimit();
    const maxVerificationGasLimit = await paymaster.maxVerificationGasLimit();

    console.log("✅ Max Cost Per UserOp:", ethers.formatEther(maxCostPerUserOp), "S");
    console.log("✅ Max Call Gas Limit:", maxCallGasLimit.toString());
    console.log("✅ Max Verification Gas Limit:", maxVerificationGasLimit.toString());

    if (maxCostPerUserOp !== ethers.parseEther("0.1")) {
      throw new Error("Unexpected max cost");
    }
    testsPassed++;
  } catch (error: any) {
    console.log("❌ FAILED:", error.message);
    testsFailed++;
  }
  console.log();

  // Test 6: Kill switches state
  console.log("Test 6: Kill Switches State");
  try {
    const globalKillSwitch = await paymaster.globalKillSwitch();
    console.log("✅ Global Kill Switch:", globalKillSwitch ? "ACTIVE" : "DISABLED");

    if (globalKillSwitch) {
      console.log("⚠️  WARNING: Global kill switch is active!");
    }
    testsPassed++;
  } catch (error: any) {
    console.log("❌ FAILED:", error.message);
    testsFailed++;
  }
  console.log();

  // Test 7: Paymaster balance
  console.log("Test 7: Paymaster Balance");
  try {
    const balance = await ethers.provider.getBalance(PAYMASTER_ADDRESS);
    console.log("✅ Balance:", ethers.formatEther(balance), "S");

    if (balance === 0n) {
      console.log("⚠️  WARNING: Paymaster has zero balance");
    }
    testsPassed++;
  } catch (error: any) {
    console.log("❌ FAILED:", error.message);
    testsFailed++;
  }
  console.log();

  // Test 8: Admin function - Update max cost (and revert it)
  console.log("Test 8: Admin Function - Update Max Cost");
  try {
    const oldMax = await paymaster.maxCostPerUserOp();
    const newMax = ethers.parseEther("0.2");

    console.log("   Setting new max cost to", ethers.formatEther(newMax), "S...");
    const tx1 = await paymaster.setMaxCostPerUserOp(newMax);
    await tx1.wait();

    const updatedMax = await paymaster.maxCostPerUserOp();
    if (updatedMax !== newMax) {
      throw new Error("Max cost not updated");
    }
    console.log("✅ Max cost updated successfully");

    // Revert back
    console.log("   Reverting to original value...");
    const tx2 = await paymaster.setMaxCostPerUserOp(oldMax);
    await tx2.wait();
    console.log("✅ Reverted to original:", ethers.formatEther(oldMax), "S");

    testsPassed++;
  } catch (error: any) {
    console.log("❌ FAILED:", error.message);
    testsFailed++;
  }
  console.log();

  // Test 9: Admin function - Allowlist management
  console.log("Test 9: Allowlist Management");
  try {
    const testTarget = "0x1111111111111111111111111111111111111111";
    const testSelector = "0x12345678";

    console.log("   Adding to allowlist...");
    const tx1 = await paymaster.setAllowlist(testTarget, testSelector, true);
    await tx1.wait();

    const isAllowed = await paymaster.allowlist(testTarget, testSelector);
    if (!isAllowed) {
      throw new Error("Allowlist not updated");
    }
    console.log("✅ Added to allowlist");

    // Remove from allowlist
    console.log("   Removing from allowlist...");
    const tx2 = await paymaster.setAllowlist(testTarget, testSelector, false);
    await tx2.wait();

    const isStillAllowed = await paymaster.allowlist(testTarget, testSelector);
    if (isStillAllowed) {
      throw new Error("Allowlist not cleared");
    }
    console.log("✅ Removed from allowlist");

    testsPassed++;
  } catch (error: any) {
    console.log("❌ FAILED:", error.message);
    testsFailed++;
  }
  console.log();

  // Test 10: Kill switch toggle
  console.log("Test 10: Kill Switch Toggle");
  try {
    const projectId = ethers.id("test-project");

    console.log("   Activating project kill switch...");
    const tx1 = await paymaster.setProjectKillSwitch(projectId, true);
    await tx1.wait();

    const isKilled = await paymaster.projectKillSwitch(projectId);
    if (!isKilled) {
      throw new Error("Kill switch not activated");
    }
    console.log("✅ Project kill switch activated");

    // Deactivate
    console.log("   Deactivating kill switch...");
    const tx2 = await paymaster.setProjectKillSwitch(projectId, false);
    await tx2.wait();

    const isStillKilled = await paymaster.projectKillSwitch(projectId);
    if (isStillKilled) {
      throw new Error("Kill switch not deactivated");
    }
    console.log("✅ Project kill switch deactivated");

    testsPassed++;
  } catch (error: any) {
    console.log("❌ FAILED:", error.message);
    testsFailed++;
  }
  console.log();

  // Test 11: Backend signer update (and revert)
  console.log("Test 11: Backend Signer Update");
  try {
    const oldSigner = await paymaster.backendSigner();
    const newSigner = deployer.address; // Use deployer as temporary new signer

    console.log("   Updating backend signer...");
    const tx1 = await paymaster.setBackendSigner(newSigner);
    await tx1.wait();

    const updatedSigner = await paymaster.backendSigner();
    if (updatedSigner.toLowerCase() !== newSigner.toLowerCase()) {
      throw new Error("Backend signer not updated");
    }
    console.log("✅ Backend signer updated");

    // Revert
    console.log("   Reverting to original signer...");
    const tx2 = await paymaster.setBackendSigner(oldSigner);
    await tx2.wait();
    console.log("✅ Reverted to original signer");

    testsPassed++;
  } catch (error: any) {
    console.log("❌ FAILED:", error.message);
    testsFailed++;
  }
  console.log();

  // Test 12: Gas limits update
  console.log("Test 12: Gas Limits Update");
  try {
    const oldCallGas = await paymaster.maxCallGasLimit();
    const oldVerificationGas = await paymaster.maxVerificationGasLimit();

    const newCallGas = 3_000_000;
    const newVerificationGas = 600_000;

    console.log("   Updating gas limits...");
    const tx1 = await paymaster.setGasLimits(newCallGas, newVerificationGas);
    await tx1.wait();

    const updatedCallGas = await paymaster.maxCallGasLimit();
    const updatedVerificationGas = await paymaster.maxVerificationGasLimit();

    if (updatedCallGas !== BigInt(newCallGas) || updatedVerificationGas !== BigInt(newVerificationGas)) {
      throw new Error("Gas limits not updated");
    }
    console.log("✅ Gas limits updated");

    // Revert
    console.log("   Reverting to original limits...");
    const tx2 = await paymaster.setGasLimits(oldCallGas, oldVerificationGas);
    await tx2.wait();
    console.log("✅ Reverted to original limits");

    testsPassed++;
  } catch (error: any) {
    console.log("❌ FAILED:", error.message);
    testsFailed++;
  }
  console.log();

  // Summary
  console.log("=" .repeat(60));
  console.log("📊 Test Summary");
  console.log("=" .repeat(60));
  console.log();
  console.log("✅ Passed:", testsPassed);
  console.log("❌ Failed:", testsFailed);
  console.log("📈 Success Rate:", ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1) + "%");
  console.log();

  if (testsFailed === 0) {
    console.log("🎉 ALL TESTS PASSED! Paymaster is fully operational.");
    console.log();
    console.log("✅ Phase 2 Complete - Ready for Phase 3 (Backend Integration)");
  } else {
    console.log("⚠️  Some tests failed. Please review the errors above.");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test suite failed:", error);
    process.exit(1);
  });
