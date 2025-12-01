// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Proxy {
    address public lib;     // Slot 0
    address public owner;   // Slot 1 - This collides with Logic's 'number'
    uint256 public number;  // Slot 2

    constructor(address _lib) {
        lib = _lib;
        owner = msg.sender;
    }

    function execute(bytes calldata data) external {
        (bool success, ) = lib.delegatecall(data);
        require(success, "Delegatecall failed");
    }
}
