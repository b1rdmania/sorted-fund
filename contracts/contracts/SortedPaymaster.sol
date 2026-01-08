// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title SortedPaymaster
 * @notice ERC-4337 v0.7 Verifying Paymaster for Sorted.fund
 * @dev Validates backend-signed sponsorship authorizations and enforces policy constraints
 *
 * Architecture:
 * 1. Backend signs paymasterAndData payload with authorization details
 * 2. EntryPoint calls validatePaymasterUserOp during UserOp validation
 * 3. Paymaster verifies signature, allowlist, gas limits, and kill switches
 * 4. If valid, returns validation data; otherwise reverts
 */
contract SortedPaymaster is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice EntryPoint v0.7 address (canonical on Sonic testnet)
    address public immutable ENTRY_POINT;

    /// @notice Backend signer address authorized to sign paymasterAndData
    address public backendSigner;

    /// @notice Global kill switch - when true, all sponsorships are blocked
    bool public globalKillSwitch;

    /// @notice Per-project kill switches
    mapping(bytes32 => bool) public projectKillSwitch;

    /// @notice Allowlist: target contract -> function selector -> enabled
    mapping(address => mapping(bytes4 => bool)) public allowlist;

    /// @notice Maximum gas cost per UserOperation (in wei)
    uint256 public maxCostPerUserOp;

    /// @notice Maximum callGasLimit allowed
    uint256 public maxCallGasLimit;

    /// @notice Maximum verificationGasLimit allowed
    uint256 public maxVerificationGasLimit;

    // Events
    event BackendSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event GlobalKillSwitchToggled(bool enabled);
    event ProjectKillSwitchToggled(bytes32 indexed projectId, bool enabled);
    event AllowlistUpdated(address indexed target, bytes4 indexed selector, bool enabled);
    event MaxCostUpdated(uint256 oldMax, uint256 newMax);
    event GasLimitsUpdated(uint256 maxCallGas, uint256 maxVerificationGas);
    event UserOpSponsored(address indexed sender, bytes32 userOpHash, uint256 actualGasCost);

    // Errors
    error OnlyEntryPoint();
    error GlobalKillSwitchActive();
    error ProjectKillSwitchActive(bytes32 projectId);
    error InvalidSignature();
    error SignatureExpired(uint48 expiry, uint48 currentTime);
    error MaxCostExceeded(uint256 requested, uint256 max);
    error CallGasLimitExceeded(uint256 requested, uint256 max);
    error VerificationGasLimitExceeded(uint256 requested, uint256 max);
    error TargetNotAllowlisted(address target, bytes4 selector);
    error InvalidBackendSigner();

    /**
     * @notice Constructor
     * @param _entryPoint Address of EntryPoint v0.7
     * @param _backendSigner Initial backend signer address
     */
    constructor(
        address _entryPoint,
        address _backendSigner
    ) Ownable(msg.sender) {
        require(_entryPoint != address(0), "Invalid EntryPoint");
        require(_backendSigner != address(0), "Invalid backend signer");

        ENTRY_POINT = _entryPoint;
        backendSigner = _backendSigner;

        // Default limits (can be updated by owner)
        maxCostPerUserOp = 0.1 ether; // 0.1 S
        maxCallGasLimit = 2_000_000;
        maxVerificationGasLimit = 500_000;
    }

    /**
     * @notice Only EntryPoint can call this function
     */
    modifier onlyEntryPoint() {
        if (msg.sender != ENTRY_POINT) revert OnlyEntryPoint();
        _;
    }

    /**
     * @notice Validate a UserOperation's paymaster data
     * @dev Called by EntryPoint during UserOp validation phase
     *
     * paymasterAndData format:
     * - bytes 0-19: paymaster address (this contract)
     * - bytes 20-25: expiry timestamp (uint48)
     * - bytes 26-57: max cost (uint256)
     * - bytes 58-89: policy hash (bytes32)
     * - bytes 90-153: signature (65 bytes - r, s, v)
     *
     * @param userOp The UserOperation struct
     * @param maxCost Maximum cost the paymaster agrees to pay
     * @return context Context data for postOp (if needed)
     * @return validationData Validation result (0 = valid)
     */
    function validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 /* userOpHash */,
        uint256 maxCost
    ) external onlyEntryPoint returns (bytes memory context, uint256 validationData) {
        // Check global kill switch
        if (globalKillSwitch) revert GlobalKillSwitchActive();

        // Parse paymasterAndData
        (
            uint48 expiry,
            uint256 authorizedMaxCost,
            bytes32 policyHash,
            bytes32 projectId,
            bytes memory signature
        ) = _parsePaymasterAndData(userOp.paymasterAndData);

        // Check project kill switch
        if (projectKillSwitch[projectId]) revert ProjectKillSwitchActive(projectId);

        // Verify signature
        bytes32 hash = _getHash(
            userOp.sender,
            userOp.nonce,
            expiry,
            authorizedMaxCost,
            policyHash,
            projectId
        );

        address recoveredSigner = hash.toEthSignedMessageHash().recover(signature);
        if (recoveredSigner != backendSigner) revert InvalidSignature();

        // Check expiry
        if (uint48(block.timestamp) > expiry) {
            revert SignatureExpired(expiry, uint48(block.timestamp));
        }

        // Validate max cost
        if (maxCost > authorizedMaxCost) revert MaxCostExceeded(maxCost, authorizedMaxCost);
        if (authorizedMaxCost > maxCostPerUserOp) {
            revert MaxCostExceeded(authorizedMaxCost, maxCostPerUserOp);
        }

        // Validate gas limits
        (uint256 callGasLimit, uint256 verificationGasLimit) = _unpackGasLimits(userOp.accountGasLimits);
        if (callGasLimit > maxCallGasLimit) {
            revert CallGasLimitExceeded(callGasLimit, maxCallGasLimit);
        }
        if (verificationGasLimit > maxVerificationGasLimit) {
            revert VerificationGasLimitExceeded(verificationGasLimit, maxVerificationGasLimit);
        }

        // Validate allowlist (extract target and selector from callData)
        (address target, bytes4 selector) = _extractTargetAndSelector(userOp.callData);
        if (!allowlist[target][selector]) {
            revert TargetNotAllowlisted(target, selector);
        }

        // Return success with expiry in validationData
        // validationData format: validAfter (6 bytes) | validUntil (6 bytes) | authorizer (20 bytes)
        validationData = _packValidationData(false, expiry, 0);
        context = ""; // No postOp needed for now
    }

    /**
     * @notice Parse paymasterAndData into components
     */
    function _parsePaymasterAndData(bytes calldata paymasterAndData)
        internal
        pure
        returns (
            uint48 expiry,
            uint256 maxCost,
            bytes32 policyHash,
            bytes32 projectId,
            bytes memory signature
        )
    {
        // paymasterAndData layout (ERC-4337 v0.7):
        // 0-19: paymaster address (20 bytes) - already validated by EntryPoint
        // 20-35: paymasterVerificationGasLimit (16 bytes = uint128)
        // 36-51: paymasterPostOpGasLimit (16 bytes = uint128)
        // 52-57: expiry (6 bytes = uint48)
        // 58-89: maxCost (32 bytes = uint256)
        // 90-121: policyHash (32 bytes)
        // 122-153: projectId (32 bytes)
        // 154-218: signature (65 bytes)
        // Total: 219 bytes

        require(paymasterAndData.length >= 219, "Invalid paymasterAndData length");

        // Skip gas limits (bytes 20-51) and parse custom data
        expiry = uint48(bytes6(paymasterAndData[52:58]));
        maxCost = uint256(bytes32(paymasterAndData[58:90]));
        policyHash = bytes32(paymasterAndData[90:122]);
        projectId = bytes32(paymasterAndData[122:154]);
        signature = paymasterAndData[154:219];
    }

    /**
     * @notice Generate hash for signature verification
     */
    function _getHash(
        address sender,
        uint256 nonce,
        uint48 expiry,
        uint256 maxCost,
        bytes32 policyHash,
        bytes32 projectId
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                sender,
                nonce,
                expiry,
                maxCost,
                policyHash,
                projectId,
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @notice Extract target contract and function selector from callData
     * @dev Assumes callData is a call to execute() on the smart account
     */
    function _extractTargetAndSelector(bytes calldata callData)
        internal
        pure
        returns (address target, bytes4 selector)
    {
        // CallData format for smart account execute():
        // 0-3: execute selector (4 bytes)
        // 4-35: target address (32 bytes, padded)
        // 36-67: value (32 bytes)
        // 68-99: data offset pointer (32 bytes) = 96 (0x60)
        // 100-131: data length (32 bytes) = 4
        // 132-135: actual inner call data selector (4 bytes)

        if (callData.length < 136) {
            return (address(0), bytes4(0));
        }

        // Extract target (bytes 4-35)
        target = address(uint160(uint256(bytes32(callData[4:36]))));

        // Extract selector from the inner call data (starts at byte 132)
        selector = bytes4(callData[132:136]);
    }

    /**
     * @notice Unpack gas limits from accountGasLimits
     * @dev accountGasLimits packs verificationGasLimit and callGasLimit
     */
    function _unpackGasLimits(bytes32 accountGasLimits)
        internal
        pure
        returns (uint256 callGasLimit, uint256 verificationGasLimit)
    {
        verificationGasLimit = uint128(uint256(accountGasLimits) >> 128);
        callGasLimit = uint128(uint256(accountGasLimits));
    }

    /**
     * @notice Pack validation data for return to EntryPoint
     */
    function _packValidationData(bool sigFailed, uint48 validUntil, uint48 validAfter)
        internal
        pure
        returns (uint256)
    {
        return (sigFailed ? 1 : 0) | (uint256(validUntil) << 160) | (uint256(validAfter) << 208);
    }

    // ============ Admin Functions ============

    /**
     * @notice Update backend signer address
     */
    function setBackendSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidBackendSigner();
        address oldSigner = backendSigner;
        backendSigner = newSigner;
        emit BackendSignerUpdated(oldSigner, newSigner);
    }

    /**
     * @notice Toggle global kill switch
     */
    function setGlobalKillSwitch(bool enabled) external onlyOwner {
        globalKillSwitch = enabled;
        emit GlobalKillSwitchToggled(enabled);
    }

    /**
     * @notice Toggle project-specific kill switch
     */
    function setProjectKillSwitch(bytes32 projectId, bool enabled) external onlyOwner {
        projectKillSwitch[projectId] = enabled;
        emit ProjectKillSwitchToggled(projectId, enabled);
    }

    /**
     * @notice Update allowlist for target contract and selector
     */
    function setAllowlist(address target, bytes4 selector, bool enabled) external onlyOwner {
        allowlist[target][selector] = enabled;
        emit AllowlistUpdated(target, selector, enabled);
    }

    /**
     * @notice Batch update allowlist
     */
    function setAllowlistBatch(
        address[] calldata targets,
        bytes4[] calldata selectors,
        bool[] calldata enabled
    ) external onlyOwner {
        require(
            targets.length == selectors.length && selectors.length == enabled.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < targets.length; i++) {
            allowlist[targets[i]][selectors[i]] = enabled[i];
            emit AllowlistUpdated(targets[i], selectors[i], enabled[i]);
        }
    }

    /**
     * @notice Update max cost per UserOp
     */
    function setMaxCostPerUserOp(uint256 newMax) external onlyOwner {
        uint256 oldMax = maxCostPerUserOp;
        maxCostPerUserOp = newMax;
        emit MaxCostUpdated(oldMax, newMax);
    }

    /**
     * @notice Update gas limits
     */
    function setGasLimits(uint256 newMaxCallGas, uint256 newMaxVerificationGas) external onlyOwner {
        maxCallGasLimit = newMaxCallGas;
        maxVerificationGasLimit = newMaxVerificationGas;
        emit GasLimitsUpdated(newMaxCallGas, newMaxVerificationGas);
    }

    /**
     * @notice Withdraw funds from paymaster
     */
    function withdraw(address payable recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @notice Add stake to EntryPoint (required for paymaster operation)
     */
    function addStake(uint32 unstakeDelaySec) external payable onlyOwner {
        IEntryPoint(ENTRY_POINT).addStake{value: msg.value}(unstakeDelaySec);
    }

    /**
     * @notice Unlock stake from EntryPoint
     */
    function unlockStake() external onlyOwner {
        IEntryPoint(ENTRY_POINT).unlockStake();
    }

    /**
     * @notice Withdraw stake from EntryPoint
     */
    function withdrawStake(address payable withdrawAddress) external onlyOwner {
        IEntryPoint(ENTRY_POINT).withdrawStake(withdrawAddress);
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}

// ============ Interfaces ============

/**
 * @notice Minimal IEntryPoint interface for staking
 */
interface IEntryPoint {
    function addStake(uint32 unstakeDelaySec) external payable;
    function unlockStake() external;
    function withdrawStake(address payable withdrawAddress) external;
}

/**
 * @notice PackedUserOperation struct from ERC-4337 v0.7
 */
struct PackedUserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    bytes32 accountGasLimits;
    uint256 preVerificationGas;
    bytes32 gasFees;
    bytes paymasterAndData;
    bytes signature;
}
