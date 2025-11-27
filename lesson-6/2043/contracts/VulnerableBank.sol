// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;  // 更新到更新的版本

/**
 * 有重入漏洞的银行合约
 * 漏洞：在更新用户余额之前进行外部调用
 */
contract VulnerableBank {
    mapping(address => uint) public balances;

    event Deposit(address indexed user, uint amount);
    event Withdraw(address indexed user, uint amount);

    // 存款函数
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    // 有重入漏洞的取款函数
    function withdraw() public {
        uint amount = balances[msg.sender];
        require(amount > 0, "Insufficient balance");

        // 漏洞点：先转账，后更新余额
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        // 余额更新在转账之后，这给了攻击者重入的机会
        balances[msg.sender] = 0;

        emit Withdraw(msg.sender, amount);
    }

    // 获取合约余额
    function getBankBalance() public view returns (uint) {
        return address(this).balance;
    }

    // 获取用户余额
    function getUserBalance(address user) public view returns (uint) {
        return balances[user];
    }

    // 接收ETH的函数
    receive() external payable {}
}