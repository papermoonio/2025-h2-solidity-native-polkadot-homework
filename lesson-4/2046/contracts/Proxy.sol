// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Simple Proxy demonstrating delegatecall
contract Proxy {
    // storage slot 0：与 Logic 中的 count 对齐
    uint256 public count;

    // 存储逻辑合约地址
    address public implementation;

    constructor(address _impl) {
        implementation = _impl;
    }

    /// 通过 delegatecall 调用实现合约的 increment()
    /// 注意：delegatecall 会在当前合约（Proxy）的 storage 上执行逻辑合约的代码
    function increment() external returns (bool) {
        (bool success, ) = implementation.delegatecall(
            abi.encodeWithSignature("increment()")
        );
        require(success, "delegatecall failed");
        return success;
    }

    /// 可选：允许更新 implementation 地址（生产中需访问控制）
    function setImplementation(address _impl) external {
        implementation = _impl;
    }
}