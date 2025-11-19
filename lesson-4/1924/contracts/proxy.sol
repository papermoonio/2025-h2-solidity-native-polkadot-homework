// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 代理合约 - 使用 delegatecall
contract ProxyContract {
    uint256 public counter; // 代理合约自己的存储槽

    // delegatecall 调用逻辑合约的 increment 函数
    function incrementViaDelegate(address logic) external {
        (bool success, ) = logic.delegatecall(
            abi.encodeWithSignature("increment()")
        );
        require(success, "delegatecall failed");
    }
}