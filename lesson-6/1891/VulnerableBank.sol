// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title VulnerableBank
 * @dev 存在重入漏洞的银行合约
 * 这个合约演示了经典的重入攻击漏洞
 */
contract VulnerableBank {
    // 用户余额映射
    mapping(address => uint256) public balances;

    // 事件
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    /**
     * @dev 存款函数
     */
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev 提款函数 - 存在重入漏洞
     * 漏洞：在更新余额之前发送ETH
     * 这允许攻击者在回调函数中再次调用withdraw
     */
    function withdraw(uint256 amount) public {
        require(amount > 0, "Withdrawal amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // 漏洞：在更新余额之前发送ETH
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        // 余额更新发生在转账之后
        balances[msg.sender] -= amount;

        emit Withdrawal(msg.sender, amount);
    }

    /**
     * @dev 获取合约余额
     */
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev 获取用户余额
     */
    function getUserBalance(address user) public view returns (uint256) {
        return balances[user];
    }

    /**
     * @dev 接收ETH
     */
    receive() external payable {
        deposit();
    }
}
