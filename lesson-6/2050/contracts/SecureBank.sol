// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SecureBank
 * @dev 修复了重入漏洞的安全银行合约 - Polkadot Asset Hub 版本
 * 
 * 安全措施：
 * 1. 使用 Checks-Effects-Interactions 模式
 * 2. 先更新状态，再进行外部调用
 * 3. 使用 ReentrancyGuard（可选）
 */
contract SecureBank {
    mapping(address => uint256) public balances;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    
    /**
     * @dev 存款函数
     */
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev 安全的取款函数
     * 
     * 修复方案：Checks-Effects-Interactions 模式
     * 1. Checks: 检查条件
     * 2. Effects: 更新状态
     * 3. Interactions: 外部调用
     */
    function withdraw(uint256 _amount) public {
        // 1. Checks: 检查余额
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        // 2. Effects: 先更新状态！
        // ✅ 关键：在转账前更新余额
        balances[msg.sender] -= _amount;
        
        // 3. Interactions: 最后进行外部调用
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
        
        emit Withdraw(msg.sender, _amount);
    }
    
    /**
     * @dev 查询余额
     */
    function getBalance(address _user) public view returns (uint256) {
        return balances[_user];
    }
    
    /**
     * @dev 查询合约总余额
     */
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
