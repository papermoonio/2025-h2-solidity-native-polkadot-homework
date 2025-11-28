// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Logic contract - 提供 increment()，但通过 delegatecall 在代理合约的存储上执行
contract Logic {
    // 注意：为了保证 delegatecall 时 storage slot 对齐，这里也声明了 count（slot 0）
    uint256 public count;

    /// 每次调用将 count 增加 1
    function increment() public {
        count += 1;
    }
}