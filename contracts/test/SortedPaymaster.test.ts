import { expect } from "chai";
import { ethers } from "hardhat";
import { SortedPaymaster } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("SortedPaymaster", function () {
  let paymaster: SortedPaymaster;
  let owner: SignerWithAddress;
  let backendSigner: SignerWithAddress;
  let newBackendSigner: SignerWithAddress;
  let user: SignerWithAddress;
  let entryPoint: SignerWithAddress; // Mock EntryPoint

  const MOCK_TARGET = "0x1234567890123456789012345678901234567890";
  const MOCK_SELECTOR = "0x12345678";
  const PROJECT_ID = ethers.id("test-project");

  beforeEach(async function () {
    [owner, backendSigner, newBackendSigner, user, entryPoint] = await ethers.getSigners();

    const PaymasterFactory = await ethers.getContractFactory("SortedPaymaster");
    paymaster = await PaymasterFactory.deploy(
      entryPoint.address,
      backendSigner.address
    );
    await paymaster.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct EntryPoint address", async function () {
      expect(await paymaster.ENTRY_POINT()).to.equal(entryPoint.address);
    });

    it("Should set the correct backend signer", async function () {
      expect(await paymaster.backendSigner()).to.equal(backendSigner.address);
    });

    it("Should set the correct owner", async function () {
      expect(await paymaster.owner()).to.equal(owner.address);
    });

    it("Should initialize with correct default limits", async function () {
      expect(await paymaster.maxCostPerUserOp()).to.equal(ethers.parseEther("0.1"));
      expect(await paymaster.maxCallGasLimit()).to.equal(2_000_000);
      expect(await paymaster.maxVerificationGasLimit()).to.equal(500_000);
    });

    it("Should initialize with kill switches disabled", async function () {
      expect(await paymaster.globalKillSwitch()).to.equal(false);
      expect(await paymaster.projectKillSwitch(PROJECT_ID)).to.equal(false);
    });
  });

  describe("Admin Functions", function () {
    describe("setBackendSigner", function () {
      it("Should allow owner to update backend signer", async function () {
        await expect(paymaster.setBackendSigner(newBackendSigner.address))
          .to.emit(paymaster, "BackendSignerUpdated")
          .withArgs(backendSigner.address, newBackendSigner.address);

        expect(await paymaster.backendSigner()).to.equal(newBackendSigner.address);
      });

      it("Should revert if non-owner tries to update", async function () {
        await expect(
          paymaster.connect(user).setBackendSigner(newBackendSigner.address)
        ).to.be.revertedWithCustomError(paymaster, "OwnableUnauthorizedAccount");
      });

      it("Should revert if setting zero address", async function () {
        await expect(
          paymaster.setBackendSigner(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(paymaster, "InvalidBackendSigner");
      });
    });

    describe("setGlobalKillSwitch", function () {
      it("Should allow owner to toggle global kill switch", async function () {
        await expect(paymaster.setGlobalKillSwitch(true))
          .to.emit(paymaster, "GlobalKillSwitchToggled")
          .withArgs(true);

        expect(await paymaster.globalKillSwitch()).to.equal(true);

        await expect(paymaster.setGlobalKillSwitch(false))
          .to.emit(paymaster, "GlobalKillSwitchToggled")
          .withArgs(false);

        expect(await paymaster.globalKillSwitch()).to.equal(false);
      });

      it("Should revert if non-owner tries to toggle", async function () {
        await expect(
          paymaster.connect(user).setGlobalKillSwitch(true)
        ).to.be.revertedWithCustomError(paymaster, "OwnableUnauthorizedAccount");
      });
    });

    describe("setProjectKillSwitch", function () {
      it("Should allow owner to toggle project kill switch", async function () {
        await expect(paymaster.setProjectKillSwitch(PROJECT_ID, true))
          .to.emit(paymaster, "ProjectKillSwitchToggled")
          .withArgs(PROJECT_ID, true);

        expect(await paymaster.projectKillSwitch(PROJECT_ID)).to.equal(true);
      });

      it("Should revert if non-owner tries to toggle", async function () {
        await expect(
          paymaster.connect(user).setProjectKillSwitch(PROJECT_ID, true)
        ).to.be.revertedWithCustomError(paymaster, "OwnableUnauthorizedAccount");
      });
    });

    describe("setAllowlist", function () {
      it("Should allow owner to update allowlist", async function () {
        await expect(paymaster.setAllowlist(MOCK_TARGET, MOCK_SELECTOR, true))
          .to.emit(paymaster, "AllowlistUpdated")
          .withArgs(MOCK_TARGET, MOCK_SELECTOR, true);

        expect(await paymaster.allowlist(MOCK_TARGET, MOCK_SELECTOR)).to.equal(true);
      });

      it("Should allow owner to remove from allowlist", async function () {
        await paymaster.setAllowlist(MOCK_TARGET, MOCK_SELECTOR, true);

        await expect(paymaster.setAllowlist(MOCK_TARGET, MOCK_SELECTOR, false))
          .to.emit(paymaster, "AllowlistUpdated")
          .withArgs(MOCK_TARGET, MOCK_SELECTOR, false);

        expect(await paymaster.allowlist(MOCK_TARGET, MOCK_SELECTOR)).to.equal(false);
      });

      it("Should revert if non-owner tries to update", async function () {
        await expect(
          paymaster.connect(user).setAllowlist(MOCK_TARGET, MOCK_SELECTOR, true)
        ).to.be.revertedWithCustomError(paymaster, "OwnableUnauthorizedAccount");
      });
    });

    describe("setAllowlistBatch", function () {
      it("Should allow batch allowlist updates", async function () {
        const targets = [MOCK_TARGET, MOCK_TARGET];
        const selectors = ["0x12345678", "0x87654321"];
        const enabled = [true, true];

        await paymaster.setAllowlistBatch(targets, selectors, enabled);

        expect(await paymaster.allowlist(MOCK_TARGET, selectors[0])).to.equal(true);
        expect(await paymaster.allowlist(MOCK_TARGET, selectors[1])).to.equal(true);
      });

      it("Should revert if array lengths mismatch", async function () {
        const targets = [MOCK_TARGET];
        const selectors = ["0x12345678", "0x87654321"];
        const enabled = [true];

        await expect(
          paymaster.setAllowlistBatch(targets, selectors, enabled)
        ).to.be.revertedWith("Array length mismatch");
      });
    });

    describe("setMaxCostPerUserOp", function () {
      it("Should allow owner to update max cost", async function () {
        const newMax = ethers.parseEther("0.5");
        const oldMax = await paymaster.maxCostPerUserOp();

        await expect(paymaster.setMaxCostPerUserOp(newMax))
          .to.emit(paymaster, "MaxCostUpdated")
          .withArgs(oldMax, newMax);

        expect(await paymaster.maxCostPerUserOp()).to.equal(newMax);
      });

      it("Should revert if non-owner tries to update", async function () {
        await expect(
          paymaster.connect(user).setMaxCostPerUserOp(ethers.parseEther("0.5"))
        ).to.be.revertedWithCustomError(paymaster, "OwnableUnauthorizedAccount");
      });
    });

    describe("setGasLimits", function () {
      it("Should allow owner to update gas limits", async function () {
        const newMaxCallGas = 3_000_000;
        const newMaxVerificationGas = 600_000;

        await expect(paymaster.setGasLimits(newMaxCallGas, newMaxVerificationGas))
          .to.emit(paymaster, "GasLimitsUpdated")
          .withArgs(newMaxCallGas, newMaxVerificationGas);

        expect(await paymaster.maxCallGasLimit()).to.equal(newMaxCallGas);
        expect(await paymaster.maxVerificationGasLimit()).to.equal(newMaxVerificationGas);
      });

      it("Should revert if non-owner tries to update", async function () {
        await expect(
          paymaster.connect(user).setGasLimits(3_000_000, 600_000)
        ).to.be.revertedWithCustomError(paymaster, "OwnableUnauthorizedAccount");
      });
    });

    describe("withdraw", function () {
      beforeEach(async function () {
        // Fund paymaster
        await owner.sendTransaction({
          to: await paymaster.getAddress(),
          value: ethers.parseEther("1.0"),
        });
      });

      it("Should allow owner to withdraw funds", async function () {
        const amount = ethers.parseEther("0.5");
        const initialBalance = await ethers.provider.getBalance(user.address);

        await paymaster.withdraw(user.address, amount);

        const finalBalance = await ethers.provider.getBalance(user.address);
        expect(finalBalance - initialBalance).to.equal(amount);
      });

      it("Should revert if non-owner tries to withdraw", async function () {
        await expect(
          paymaster.connect(user).withdraw(user.address, ethers.parseEther("0.5"))
        ).to.be.revertedWithCustomError(paymaster, "OwnableUnauthorizedAccount");
      });

      it("Should revert if withdrawing to zero address", async function () {
        await expect(
          paymaster.withdraw(ethers.ZeroAddress, ethers.parseEther("0.5"))
        ).to.be.revertedWith("Invalid recipient");
      });
    });
  });

  describe("validatePaymasterUserOp", function () {
    let userOp: any;
    let expiry: number;
    let maxCost: bigint;
    let policyHash: string;

    beforeEach(async function () {
      // Enable allowlist for test
      await paymaster.setAllowlist(MOCK_TARGET, MOCK_SELECTOR, true);

      // Get current timestamp and set expiry
      const currentTime = await time.latest();
      expiry = currentTime + 3600; // 1 hour from now
      maxCost = ethers.parseEther("0.05");
      policyHash = ethers.randomBytes(32);

      // Create mock UserOperation
      userOp = {
        sender: user.address,
        nonce: 1n,
        initCode: "0x",
        callData: createMockCallData(MOCK_TARGET, MOCK_SELECTOR),
        accountGasLimits: packGasLimits(100_000, 200_000),
        preVerificationGas: 50_000n,
        gasFees: packGasFees(1000000000n, 1000000000n),
        paymasterAndData: "0x",
        signature: "0x",
      };
    });

    it("Should revert if not called by EntryPoint", async function () {
      const paymasterAndData = await createPaymasterAndData(
        await paymaster.getAddress(),
        expiry,
        maxCost,
        policyHash,
        PROJECT_ID,
        backendSigner,
        userOp
      );

      userOp.paymasterAndData = paymasterAndData;

      await expect(
        paymaster.connect(user).validatePaymasterUserOp(userOp, ethers.ZeroHash, maxCost)
      ).to.be.revertedWithCustomError(paymaster, "OnlyEntryPoint");
    });

    it("Should revert if global kill switch is active", async function () {
      await paymaster.setGlobalKillSwitch(true);

      const paymasterAndData = await createPaymasterAndData(
        await paymaster.getAddress(),
        expiry,
        maxCost,
        policyHash,
        PROJECT_ID,
        backendSigner,
        userOp
      );

      userOp.paymasterAndData = paymasterAndData;

      await expect(
        paymaster.connect(entryPoint).validatePaymasterUserOp(userOp, ethers.ZeroHash, maxCost)
      ).to.be.revertedWithCustomError(paymaster, "GlobalKillSwitchActive");
    });

    it("Should revert if project kill switch is active", async function () {
      await paymaster.setProjectKillSwitch(PROJECT_ID, true);

      const paymasterAndData = await createPaymasterAndData(
        await paymaster.getAddress(),
        expiry,
        maxCost,
        policyHash,
        PROJECT_ID,
        backendSigner,
        userOp
      );

      userOp.paymasterAndData = paymasterAndData;

      await expect(
        paymaster.connect(entryPoint).validatePaymasterUserOp(userOp, ethers.ZeroHash, maxCost)
      ).to.be.revertedWithCustomError(paymaster, "ProjectKillSwitchActive");
    });

    it("Should revert if signature is invalid", async function () {
      const paymasterAndData = await createPaymasterAndData(
        await paymaster.getAddress(),
        expiry,
        maxCost,
        policyHash,
        PROJECT_ID,
        user, // Wrong signer!
        userOp
      );

      userOp.paymasterAndData = paymasterAndData;

      await expect(
        paymaster.connect(entryPoint).validatePaymasterUserOp(userOp, ethers.ZeroHash, maxCost)
      ).to.be.revertedWithCustomError(paymaster, "InvalidSignature");
    });

    it("Should revert if signature is expired", async function () {
      const pastExpiry = (await time.latest()) - 3600; // 1 hour ago

      const paymasterAndData = await createPaymasterAndData(
        await paymaster.getAddress(),
        pastExpiry,
        maxCost,
        policyHash,
        PROJECT_ID,
        backendSigner,
        userOp
      );

      userOp.paymasterAndData = paymasterAndData;

      await expect(
        paymaster.connect(entryPoint).validatePaymasterUserOp(userOp, ethers.ZeroHash, maxCost)
      ).to.be.revertedWithCustomError(paymaster, "SignatureExpired");
    });

    it("Should revert if target is not allowlisted", async function () {
      // Remove from allowlist
      await paymaster.setAllowlist(MOCK_TARGET, MOCK_SELECTOR, false);

      const paymasterAndData = await createPaymasterAndData(
        await paymaster.getAddress(),
        expiry,
        maxCost,
        policyHash,
        PROJECT_ID,
        backendSigner,
        userOp
      );

      userOp.paymasterAndData = paymasterAndData;

      await expect(
        paymaster.connect(entryPoint).validatePaymasterUserOp(userOp, ethers.ZeroHash, maxCost)
      ).to.be.revertedWithCustomError(paymaster, "TargetNotAllowlisted");
    });

    it("Should revert if callGasLimit exceeds maximum", async function () {
      userOp.accountGasLimits = packGasLimits(100_000, 3_000_000); // Exceeds max

      const paymasterAndData = await createPaymasterAndData(
        await paymaster.getAddress(),
        expiry,
        maxCost,
        policyHash,
        PROJECT_ID,
        backendSigner,
        userOp
      );

      userOp.paymasterAndData = paymasterAndData;

      await expect(
        paymaster.connect(entryPoint).validatePaymasterUserOp(userOp, ethers.ZeroHash, maxCost)
      ).to.be.revertedWithCustomError(paymaster, "CallGasLimitExceeded");
    });

    it("Should revert if verificationGasLimit exceeds maximum", async function () {
      userOp.accountGasLimits = packGasLimits(600_000, 200_000); // Verification exceeds max

      const paymasterAndData = await createPaymasterAndData(
        await paymaster.getAddress(),
        expiry,
        maxCost,
        policyHash,
        PROJECT_ID,
        backendSigner,
        userOp
      );

      userOp.paymasterAndData = paymasterAndData;

      await expect(
        paymaster.connect(entryPoint).validatePaymasterUserOp(userOp, ethers.ZeroHash, maxCost)
      ).to.be.revertedWithCustomError(paymaster, "VerificationGasLimitExceeded");
    });

    // Note: Full validation test would require proper signature creation
    // which needs exact message format matching the contract
  });

  // Helper functions
  function packGasLimits(verificationGasLimit: number, callGasLimit: number): string {
    const verification = BigInt(verificationGasLimit);
    const call = BigInt(callGasLimit);
    const packed = (verification << 128n) | call;
    return ethers.toBeHex(packed, 32);
  }

  function packGasFees(maxPriorityFeePerGas: bigint, maxFeePerGas: bigint): string {
    const packed = (maxPriorityFeePerGas << 128n) | maxFeePerGas;
    return ethers.toBeHex(packed, 32);
  }

  function createMockCallData(target: string, selector: string): string {
    // Mock callData for execute(target, value, data)
    // execute selector + target + value + data offset + data length + actual data (selector)
    const executeSelector = "0xb61d27f6"; // execute(address,uint256,bytes)
    const paddedTarget = ethers.zeroPadValue(target, 32);
    const value = ethers.zeroPadValue("0x00", 32);
    const dataOffset = ethers.zeroPadValue(ethers.toBeHex(0x60), 32);
    const dataLength = ethers.zeroPadValue(ethers.toBeHex(4), 32);
    const data = ethers.zeroPadBytes(selector, 32);

    return executeSelector + paddedTarget.slice(2) + value.slice(2) +
           dataOffset.slice(2) + dataLength.slice(2) + data.slice(2);
  }

  async function createPaymasterAndData(
    paymasterAddress: string,
    expiry: number,
    maxCost: bigint,
    policyHash: string,
    projectId: string,
    signer: SignerWithAddress,
    userOp: any
  ): Promise<string> {
    // Pack the data according to contract format
    const expiryBytes = ethers.toBeHex(expiry, 6);
    const maxCostBytes = ethers.toBeHex(maxCost, 32);
    const policyHashBytes = policyHash;
    const projectIdBytes = projectId;

    // Create hash for signing
    const hash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint48", "uint256", "bytes32", "bytes32", "uint256", "address"],
      [
        userOp.sender,
        userOp.nonce,
        expiry,
        maxCost,
        policyHashBytes,
        projectIdBytes,
        (await ethers.provider.getNetwork()).chainId,
        paymasterAddress,
      ]
    );

    // Sign the hash
    const signature = await signer.signMessage(ethers.getBytes(hash));

    // Pack everything together
    return ethers.concat([
      paymasterAddress,
      expiryBytes,
      maxCostBytes,
      policyHashBytes,
      projectIdBytes,
      signature,
    ]);
  }
});
