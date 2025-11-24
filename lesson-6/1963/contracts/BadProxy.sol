// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract BadProxy {
    // storage layout: slot 0 owner
    address public owner;
    address public implementation;

    constructor(address impl) {
        owner = msg.sender;
        implementation = impl;
    }

    function setImplementation(address impl) external {
        require(msg.sender == owner, "only owner");
        implementation = impl;
    }

    fallback() external payable {
        // delegatecall to implementation -- critical: runs impl code in proxy storage
        (bool ok, ) = implementation.delegatecall(msg.data);
        require(ok, "delegatecall failed");
    }
}