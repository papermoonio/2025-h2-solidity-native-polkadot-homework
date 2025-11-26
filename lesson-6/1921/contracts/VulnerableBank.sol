// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title VulnerableBank
 * @dev 一个存在重入漏洞的银行合约
 * 漏洞：在更新余额之前就发送了 ETH
 */
contract VulnerableBank {
    // 存储每个地址的余额
    mapping(address => uint256) public balances;
    
    // 事件：记录存款
    event Deposit(address indexed user, uint256 amount);
    // 事件：记录取款
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
     * @param _amount 要取出的金额
     */
    function withdraw(uint256 _amount) public {
        // 1. 检查余额是否足够
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        // 2. ⚠️ 漏洞：先发送 ETH（这里会触发接收者的 receive/fallback 函数）
        // 使用 call 而不是 transfer，这样会转发足够的 gas 用于重入
        msg.sender.call{value: _amount}("");
        // ⚠️ 注意：为了演示目的，这里不检查返回值
        // 实际生产环境应该加上: (bool sent, ) = ... 和 require(sent, "Failed to send Ether");
        
        // 3. ⚠️ 漏洞：后更新余额（攻击者可以在第2步重入调用 withdraw）
        // 使用 unchecked 允许下溢（仅用于演示目的）
        unchecked {
            balances[msg.sender] -= _amount;
        }
        
        emit Withdraw(msg.sender, _amount);
    }
    
    /**
     * @dev 查询合约余额
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev 查询用户余额
     */
    function getUserBalance(address _user) public view returns (uint256) {
        return balances[_user];
    }
}