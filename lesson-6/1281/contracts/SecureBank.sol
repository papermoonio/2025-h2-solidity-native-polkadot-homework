// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SecureBank
 * @dev 修复了重入漏洞的安全银行合约
 * 
 * 修复方案：
 * 1. 使用 Checks-Effects-Interactions 模式（CEI模式）
 * 2. 使用 OpenZeppelin 的 ReentrancyGuard
 * 3. 使用 transfer() 或 send() 限制 gas（可选）
 */
contract SecureBank is ReentrancyGuard {
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
     * @dev 取款函数 - 使用 CEI 模式修复
     * @param _amount 要取出的金额
     * 
     * 安全实现：
     * 1. Checks: 先检查余额
     * 2. Effects: 然后更新状态（余额）
     * 3. Interactions: 最后进行外部调用（发送 ETH）
     */
    function withdrawCEI(uint256 _amount) public {
        // 1. Checks - 检查
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        // 2. Effects - 更新状态（先更新余额！）
        balances[msg.sender] -= _amount;
        
        // 3. Interactions - 外部调用
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
        
        emit Withdraw(msg.sender, _amount);
    }
    
    /**
     * @dev 取款函数 - 使用 ReentrancyGuard 修复
     * @param _amount 要取出的金额
     * 
     * nonReentrant 修饰符会在函数执行期间锁定，防止重入
     */
    function withdrawWithGuard(uint256 _amount) public nonReentrant {
        // 1. 检查余额
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        // 2. 发送 ETH（即使顺序不对，有 nonReentrant 保护也是安全的）
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
        
        // 3. 更新余额
        balances[msg.sender] -= _amount;
        
        emit Withdraw(msg.sender, _amount);
    }
    
    /**
     * @dev 取款函数 - 使用 transfer 限制 gas
     * @param _amount 要取出的金额
     * 
     * transfer() 只转发 2300 gas，不足以执行重入攻击
     * 注意：这种方式在某些情况下可能有问题（如合约钱包）
     */
    function withdrawWithTransfer(uint256 _amount) public {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        // 先更新余额（CEI模式）
        balances[msg.sender] -= _amount;
        
        // 使用 transfer（只转发 2300 gas）
        payable(msg.sender).transfer(_amount);
        
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

