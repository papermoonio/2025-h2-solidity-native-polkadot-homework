// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SecureBank
 * @dev 安全的银行合约 - 防止重入攻击
 * 使用Checks-Effects-Interactions模式
 */
contract SecureBank {
    // 用户余额映射
    mapping(address => uint256) public balances;

    // 重入保护标志
    uint256 private locked = 1;

    // 事件
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    /**
     * @dev 重入保护修饰符
     */
    modifier nonReentrant() {
        require(locked == 1, "No reentrancy");
        locked = 2;
        _;
        locked = 1;
    }

    /**
     * @dev 存款函数
     */
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev 提款函数 - 使用Checks-Effects-Interactions模式
     * 安全做法：
     * 1. Checks: 检查条件
     * 2. Effects: 更新状态
     * 3. Interactions: 与外部合约交互
     */
    function withdraw(uint256 amount) public nonReentrant {
        // Checks
        require(amount > 0, "Withdrawal amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // Effects - 先更新状态
        balances[msg.sender] -= amount;

        // Interactions - 最后进行外部调用
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

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
