// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SimpleCounter
 * @dev 简单的计数器逻辑合约 - 这个合约只定义逻辑，不保存状态
 * 
 * 🎯 学习要点：
 * 1. 这个合约定义了业务逻辑（如何计数）
 * 2. 当通过代理调用时，修改的是代理合约的状态，不是这个合约的状态
 * 3. 状态变量的存储槽位很重要！
 */
contract SimpleCounter {
    // 📦 槽位0：计数器值
    uint256 public count;
    
    // 📦 槽位1：合约所有者
    address public owner;
    
    // 🎯 事件：用于记录操作
    event CountIncremented(uint256 newCount, address caller);
    event CountReset(address by);
    
    /**
     * @dev 增加计数器
     * 🔍 关键理解：当通过代理合约调用时：
     * - count += 1 实际修改的是代理合约槽位0的数据
     * - msg.sender 是原始调用者，不是代理合约
     */
    function increment() public {
        count += 1;
        emit CountIncremented(count, msg.sender);
    }
    
    /**
     * @dev 增加指定数值
     * @param value 要增加的数值
     */
    function incrementBy(uint256 value) public {
        require(value > 0, "Value must be greater than 0");
        count += value;
        emit CountIncremented(count, msg.sender);
    }
    
    /**
     * @dev 重置计数器（只有owner可以调用）
     * 🎯 思考：当通过代理调用时，owner应该是代理合约的owner，还是这个合约的owner？
     */
    function reset() public {
        require(msg.sender == owner, "Only owner can reset");
        count = 0;
        emit CountReset(msg.sender);
    }
    
    /**
     * @dev 设置新的所有者
     * @param newOwner 新所有者地址
     */
    function setOwner(address newOwner) public {
        require(msg.sender == owner, "Only owner can change owner");
        require(newOwner != address(0), "Owner cannot be zero address");
        owner = newOwner;
    }
    
    /**
     * @dev 获取当前计数值
     * @return 当前计数
     */
    function getCount() public view returns (uint256) {
        return count;
    }
}
