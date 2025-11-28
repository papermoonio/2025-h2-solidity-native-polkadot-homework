// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LogicContract {

    uint256 public count;

    // 增加计数函数
    function increment() external  {
        count += 1;

    }
}