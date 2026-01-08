// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title TestContract
 * @notice Placeholder contract to test Hardhat compilation in Phase 1
 * @dev This will be replaced with the actual SortedPaymaster in Phase 2
 */
contract TestContract {
    string public message;

    constructor() {
        message = "Hardhat compilation test successful";
    }

    function getMessage() public view returns (string memory) {
        return message;
    }
}
