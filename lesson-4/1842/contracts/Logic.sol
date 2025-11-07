// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 逻辑合约
contract LogicContract {
    uint256 public counter;

    function increment() external {
        counter += 1;
    }
}
