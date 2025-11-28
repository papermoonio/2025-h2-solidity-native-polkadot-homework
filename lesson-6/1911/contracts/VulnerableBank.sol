// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title VulnerableBank
 * @notice 一个故意包含重入攻击漏洞的示例银行合约，用于教学与演示。
 * @dev 演示不遵循检查-生效-交互模式（CEI）导致的重入风险。
 */
contract VulnerableBank {
    /// @notice 记录每个账户的存款余额
    mapping(address => uint256) public balances;

    /// @notice 存款事件
    event Deposited(address indexed account, uint256 amount, uint256 newBalance);
    /// @notice 提款事件（存在重入风险）
    event Withdrawn(address indexed account, uint256 amount, uint256 remainingBankBalance);

    /// @notice 自定义错误：余额不足
    error InsufficientBalance(uint256 requested, uint256 available);
    /// @notice 自定义错误：转账失败
    error TransferFailed();

    /**
     * @notice 存入 ETH 到银行
     * @dev 简单累计余额并发出事件
     */
    function deposit() external payable {
        require(msg.value > 0, "NO_VALUE");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value, balances[msg.sender]);
    }

    /**
     * @notice 提取指定数量的 ETH（包含重入漏洞）
     * @dev 漏洞点：在和外部进行交互（`call{value: amount}`）之后才更新内部状态 `balances`。
     *      这违背了检查-生效-交互模式，攻击者可在回调中再次调用 `withdraw` 重复取款。
     * @param amount 要提取的金额
     */
    function withdraw(uint256 amount) external {
        uint256 available = balances[msg.sender];
        if (available < amount) revert InsufficientBalance(amount, available);

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        // 漏洞：在外部调用完成后才更新余额，允许重入期间重复满足余额检查
        balances[msg.sender] -= amount;

        emit Withdrawn(msg.sender, amount, address(this).balance);
    }

    /**
     * @notice 银行当前持有的总余额
     * @return bal 合约地址上的 ETH 余额
     */
    function bankBalance() external view returns (uint256 bal) {
        return address(this).balance;
    }
}
