// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Logic
 * @dev 逻辑合约，包含实际的业务逻辑
 * 这个合约定义了状态变量和函数，但会通过delegatecall被代理合约调用
 */
contract Logic {
    // 状态变量 - 这些变量的存储位置会被代理合约共享
    uint256 public counter;
    address public owner;
    mapping(address => uint256) public userCounters;

    // 事件
    event CounterIncremented(address indexed caller, uint256 newValue);
    event CounterDecremented(address indexed caller, uint256 newValue);
    event CounterReset(address indexed caller);
    event OwnerChanged(address indexed newOwner);

    /**
     * @dev 初始化函数（在逻辑合约中不会被调用，但在代理合约中会通过delegatecall调用）
     */
    function initialize(address _owner) public {
        require(owner == address(0), "Already initialized");
        owner = _owner;
        counter = 0;
    }

    /**
     * @dev 增加计数器，每次调用增加1
     */
    function increment() public {
        require(owner != address(0), "Not initialized");
        counter += 1;
        userCounters[msg.sender] += 1;
        emit CounterIncremented(msg.sender, counter);
    }

    /**
     * @dev 增加指定数量
     */
    function incrementBy(uint256 amount) public {
        require(owner != address(0), "Not initialized");
        require(amount > 0, "Amount must be greater than 0");
        counter += amount;
        userCounters[msg.sender] += amount;
        emit CounterIncremented(msg.sender, counter);
    }

    /**
     * @dev 减少计数器
     */
    function decrement() public {
        require(owner != address(0), "Not initialized");
        require(counter > 0, "Counter cannot be negative");
        counter -= 1;
        userCounters[msg.sender] += 1;
        emit CounterDecremented(msg.sender, counter);
    }

    /**
     * @dev 重置计数器（仅owner可调用）
     */
    function reset() public {
        require(owner != address(0), "Not initialized");
        require(msg.sender == owner, "Only owner can reset");
        counter = 0;
        emit CounterReset(msg.sender);
    }

    /**
     * @dev 获取当前计数器值
     */
    function getCounter() public view returns (uint256) {
        return counter;
    }

    /**
     * @dev 获取用户的计数器值
     */
    function getUserCounter(address user) public view returns (uint256) {
        return userCounters[user];
    }

    /**
     * @dev 改变owner（仅owner可调用）
     */
    function changeOwner(address newOwner) public {
        require(owner != address(0), "Not initialized");
        require(msg.sender == owner, "Only owner can change owner");
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
        emit OwnerChanged(newOwner);
    }
}
