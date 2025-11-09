// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract HelloWorld {
    address public immutable i_owner;
    uint256 public sum;
    event SumUpdated(uint256 a, uint256 b, uint256 sum, address indexed updater);

    constructor() {
        i_owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == i_owner, "Only owner");
        _;
    }

    function sumTwoNum(uint256 a, uint256 b) public returns (uint256) {
        uint256 s = a + b;
        sum = s;
        emit SumUpdated(a, b, s, msg.sender);
        return s;
    }
}