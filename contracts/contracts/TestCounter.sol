// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title TestCounter
 * @notice Simple counter contract for testing Sorted.fund sponsorship
 * @dev Used to test gasless transactions via ERC-4337 with Sorted paymaster
 */
contract TestCounter {
    mapping(address => uint256) public counters;

    event Incremented(address indexed user, uint256 newValue);
    event Decremented(address indexed user, uint256 newValue);
    event Reset(address indexed user);
    event MessageStored(address indexed user, string message);

    struct UserData {
        uint256 counter;
        uint256 lastUpdate;
        string lastMessage;
    }

    mapping(address => UserData) public userData;

    /**
     * @notice Increment counter for sender
     * @dev This is the main function we'll sponsor with Sorted
     */
    function increment() external {
        counters[msg.sender]++;
        userData[msg.sender].counter = counters[msg.sender];
        userData[msg.sender].lastUpdate = block.timestamp;

        emit Incremented(msg.sender, counters[msg.sender]);
    }

    /**
     * @notice Increment counter by specific amount
     */
    function incrementBy(uint256 amount) external {
        counters[msg.sender] += amount;
        userData[msg.sender].counter = counters[msg.sender];
        userData[msg.sender].lastUpdate = block.timestamp;

        emit Incremented(msg.sender, counters[msg.sender]);
    }

    /**
     * @notice Decrement counter for sender
     */
    function decrement() external {
        require(counters[msg.sender] > 0, "TestCounter: counter already zero");
        counters[msg.sender]--;
        userData[msg.sender].counter = counters[msg.sender];
        userData[msg.sender].lastUpdate = block.timestamp;

        emit Decremented(msg.sender, counters[msg.sender]);
    }

    /**
     * @notice Reset counter to zero
     */
    function reset() external {
        counters[msg.sender] = 0;
        userData[msg.sender].counter = 0;
        userData[msg.sender].lastUpdate = block.timestamp;

        emit Reset(msg.sender);
    }

    /**
     * @notice Store a message (more complex operation)
     */
    function storeMessage(string calldata message) external {
        userData[msg.sender].lastMessage = message;
        userData[msg.sender].lastUpdate = block.timestamp;

        emit MessageStored(msg.sender, message);
    }

    /**
     * @notice Increment and store message in one transaction
     */
    function incrementAndMessage(string calldata message) external {
        counters[msg.sender]++;
        userData[msg.sender].counter = counters[msg.sender];
        userData[msg.sender].lastMessage = message;
        userData[msg.sender].lastUpdate = block.timestamp;

        emit Incremented(msg.sender, counters[msg.sender]);
        emit MessageStored(msg.sender, message);
    }

    /**
     * @notice Get counter for address
     */
    function getCounter(address user) external view returns (uint256) {
        return counters[user];
    }

    /**
     * @notice Get full user data
     */
    function getUserData(address user) external view returns (UserData memory) {
        return userData[user];
    }
}
