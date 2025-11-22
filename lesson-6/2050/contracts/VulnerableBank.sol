// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title VulnerableBank
 * @dev 一个存在重入漏洞的简单银行合约 - Polkadot Asset Hub 版本
 * 
 * 漏洞说明：
 * 1. withdraw 函数在转账前没有更新余额
 * 2. 使用 call 进行转账，允许接收者执行代码
 * 3. 攻击者可以在接收到 ETH 时再次调用 withdraw
 * 
 * 部署到 Polkadot Asset Hub 测试网进行演示
 */
contract VulnerableBank {
    // 存储每个用户的余额
    mapping(address => uint256) public balances;
    
    // 事件：存款
    event Deposit(address indexed user, uint256 amount);
    
    // 事件：取款
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
     * @dev 取款函数 - 存在重入漏洞！
     * 
     * 漏洞点：
     * 1. 先转账（第 42 行）
     * 2. 后更新余额（第 47 行）
     * 3. 这个顺序允许攻击者在余额更新前重复调用
     */
    function withdraw(uint256 _amount) public {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        // 🚨 漏洞：在更新余额之前转账！
        // 使用 call 允许接收者执行代码（重入点）
        (bool success, ) = msg.sender.call{value: _amount}("");
        if (!success) {
            revert("Transfer failed");
        }
        
        // 🚨 漏洞：余额更新太晚了！
        // 攻击者可以在这行执行前多次调用 withdraw
        // 注意：使用 unchecked 是为了演示漏洞，实际代码不应该这样做
        unchecked {
            balances[msg.sender] -= _amount;
        }
        
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
