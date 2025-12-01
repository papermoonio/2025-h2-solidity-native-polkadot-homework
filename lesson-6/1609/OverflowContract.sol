// SPDX-License-Identifier: MIT
pragma solidity 0.7.6; // 使用0.8.0之前的版本，因为该版本没有自动溢出检查

/**
 * @title 整数溢出漏洞演示合约
 * @dev 该合约演示了Solidity中的整数溢出漏洞，包括加法、减法和乘法溢出
 *      在Solidity 0.8.0之前，整数溢出会导致环绕而不是抛出错误
 */
contract OverflowContract {
    // 定义事件以跟踪合约操作
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event OverflowAttackSuccessful(address indexed attacker, uint256 fundsStolen);
    
    // 用户余额映射
    mapping(address => uint256) public balances;
    
    // 合约的总存款
    uint256 public totalDeposits;
    
    /**
     * @dev 存款函数
     * @notice 将ETH存入合约并更新用户余额
     */
    function deposit() public payable {
        // 漏洞点1: 加法溢出风险
        // 如果totalDeposits非常大，加上msg.value可能会导致溢出
        totalDeposits = totalDeposits + msg.value;
        
        // 更新用户余额
        balances[msg.sender] = balances[msg.sender] + msg.value;
        
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev 不安全的提款函数，存在减法溢出漏洞
     * @param amount 要提取的金额
     */
    function unsafeWithdraw(uint256 amount) public {
        // 漏洞点2: 缺少余额检查，可能导致减法溢出
        // 如果用户余额小于amount，balances[msg.sender] - amount会导致溢出
        balances[msg.sender] = balances[msg.sender] - amount;
        totalDeposits = totalDeposits - amount;
        
        // 发送ETH给用户
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev 不安全的资金翻倍函数，存在乘法溢出漏洞
     * @param amount 要翻倍的金额
     */
    function unsafeDoubleFunds(uint256 amount) public {
        // 漏洞点3: 乘法溢出风险
        // 如果amount非常大，amount * 2会导致溢出
        uint256 doubledAmount = amount * 2;
        
        // 验证用户余额
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // 更新余额
        balances[msg.sender] = balances[msg.sender] - amount;
        balances[msg.sender] = balances[msg.sender] + doubledAmount;
        
        // 更新总存款
        totalDeposits = totalDeposits + amount; // 这里会导致总存款增加
    }
    
    /**
     * @dev 演示如何利用溢出漏洞进行攻击
     * @param attackAmount 攻击金额
     */
    function overflowAttack(uint256 attackAmount) public {
        // 验证用户有足够的余额进行攻击演示
        require(balances[msg.sender] >= attackAmount, "Insufficient balance");
        
        // 漏洞利用: 尝试提取超过余额的金额，触发减法溢出
        // 在Solidity 0.7.6中，这不会抛出错误，而是会环绕到一个非常大的正数
        balances[msg.sender] = balances[msg.sender] - (attackAmount + 1);
        
        // 计算被盗资金 (这会是一个非常大的数字，可能超过合约的实际余额)
        uint256 stolenFunds = balances[msg.sender];
        
        // 尝试提取被盗资金
        if (address(this).balance >= stolenFunds) {
            (bool success, ) = msg.sender.call{value: stolenFunds}("");
            if (success) {
                emit OverflowAttackSuccessful(msg.sender, stolenFunds);
            }
        }
    }
    
    /**
     * @dev 获取合约当前余额
     */
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev 演示安全加法（仅供教学目的）
     */
    function safeAdd(uint256 a, uint256 b) public pure returns (uint256) {
        // 在0.8.0之前，应该这样手动检查溢出
        require(a + b >= a, "Addition overflow");
        return a + b;
    }
    
    /**
     * @dev 演示安全减法（仅供教学目的）
     */
    function safeSub(uint256 a, uint256 b) public pure returns (uint256) {
        // 在0.8.0之前，应该这样手动检查溢出
        require(a >= b, "Subtraction overflow");
        return a - b;
    }
    
    /**
     * @dev 演示安全乘法（仅供教学目的）
     */
    function safeMul(uint256 a, uint256 b) public pure returns (uint256) {
        // 在0.8.0之前，应该这样手动检查溢出
        if (a == 0) return 0;
        require(b <= type(uint256).max / a, "Multiplication overflow");
        return a * b;
    }
}