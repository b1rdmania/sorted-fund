// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@account-abstraction/contracts/core/EntryPoint.sol";
import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title SimpleAccount
 * @notice Minimal ERC-4337 v0.7 smart account for testing Sorted.fund
 * @dev Single-owner account that validates signatures via ECDSA
 */
contract SimpleAccount is IAccount {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public owner;
    IEntryPoint private immutable _entryPoint;
    uint256 private _nonce;

    event AccountCreated(address indexed owner);
    event ExecutionSuccess(address indexed target, uint256 value);
    event ExecutionFailure(address indexed target, uint256 value);

    modifier onlyOwner() {
        require(msg.sender == owner, "SimpleAccount: not owner");
        _;
    }

    modifier onlyEntryPoint() {
        require(msg.sender == address(_entryPoint), "SimpleAccount: not from EntryPoint");
        _;
    }

    constructor(IEntryPoint entryPoint_, address owner_) {
        _entryPoint = entryPoint_;
        owner = owner_;
        emit AccountCreated(owner_);
    }

    /**
     * @notice Validate user operation signature
     * @dev Called by EntryPoint to validate the UserOp before execution
     */
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external onlyEntryPoint returns (uint256 validationData) {
        // Validate signature
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address signer = hash.recover(userOp.signature);

        if (signer != owner) {
            return SIG_VALIDATION_FAILED;
        }

        // Pay the EntryPoint if needed
        if (missingAccountFunds > 0) {
            (bool success, ) = payable(msg.sender).call{value: missingAccountFunds}("");
            require(success, "SimpleAccount: failed to pay EntryPoint");
        }

        return 0; // Signature valid
    }

    /**
     * @notice Execute a transaction
     * @dev Called by EntryPoint after validation
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyEntryPoint {
        (bool success, ) = target.call{value: value}(data);
        if (success) {
            emit ExecutionSuccess(target, value);
        } else {
            emit ExecutionFailure(target, value);
            revert("SimpleAccount: execution failed");
        }
    }

    /**
     * @notice Execute a batch of transactions
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external onlyEntryPoint {
        require(
            targets.length == values.length && values.length == datas.length,
            "SimpleAccount: length mismatch"
        );

        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, ) = targets[i].call{value: values[i]}(datas[i]);
            if (success) {
                emit ExecutionSuccess(targets[i], values[i]);
            } else {
                emit ExecutionFailure(targets[i], values[i]);
            }
        }
    }

    /**
     * @notice Get the EntryPoint address
     */
    function entryPoint() public view returns (IEntryPoint) {
        return _entryPoint;
    }

    /**
     * @notice Get current nonce
     */
    function getNonce() public view returns (uint256) {
        return _entryPoint.getNonce(address(this), 0);
    }

    /**
     * @notice Deposit funds to EntryPoint
     */
    function addDeposit() public payable {
        _entryPoint.depositTo{value: msg.value}(address(this));
    }

    /**
     * @notice Withdraw funds from EntryPoint
     */
    function withdrawDepositTo(address payable withdrawAddress, uint256 amount) public onlyOwner {
        _entryPoint.withdrawTo(withdrawAddress, amount);
    }

    /**
     * @notice Get deposit info from EntryPoint
     */
    function getDeposit() public view returns (uint256) {
        return _entryPoint.balanceOf(address(this));
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}
