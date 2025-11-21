// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Logic {
    uint256 public count;

    function increment() external {
        count += 1;
    }
}