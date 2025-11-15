// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Logic
 * @dev 逻辑合约，包含实际的业务逻辑
 */
contract Logic {
    // 状态变量必须与代理合约的存储布局一致
    uint256 public counter;
    
    /**
     * @dev 增加计数器的值
     */
    function increment() public {
        counter += 1;
    }
    
    /**
     * @dev 增加指定数量
     * @param amount 要增加的数量
     */
    function incrementBy(uint256 amount) public {
        counter += amount;
    }
    
    /**
     * @dev 设置计数器的值
     * @param value 新的计数器值
     */
    function setCounter(uint256 value) public {
        counter = value;
    }
    
    /**
     * @dev 获取当前计数器的值
     */
    function getCounter() public view returns (uint256) {
        return counter;
    }
}
