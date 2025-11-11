// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title 逻辑合约
 * @dev 包含简单的计数器功能，用于被代理合约通过delegatecall调用
 */
contract LogicContract {
    // 重要：确保与代理合约的存储布局完全一致
    // 这里不需要存储逻辑合约地址，因为delegatecall会使用调用者的存储
    
    // 状态变量：计数器 - 确保与代理合约中的counter在相同的存储槽位
    uint256 public counter;
    
    /**
     * @dev 增加计数器的函数
     * @return 增加后的计数值
     */
    function increment() public returns (uint256) {
        counter += 1;
        return counter;
    }
    
    /**
     * @dev 获取当前计数值
     * @return 当前计数值
     */
    function getCounter() public view returns (uint256) {
        return counter;
    }
}