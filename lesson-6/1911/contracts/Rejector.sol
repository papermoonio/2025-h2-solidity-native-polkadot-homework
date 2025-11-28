// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VulnerableBank} from "./VulnerableBank.sol";

/**
 * @title Rejector
 * @notice 一个拒绝接收 ETH 的合约，用于触发 VulnerableBank 的 TransferFailed 错误分支。
 */
contract Rejector {
    /// @notice 将资金存入银行
    function depositToBank(address bankAddr) external payable {
        VulnerableBank(bankAddr).deposit{value: msg.value}();
    }

    /// @notice 从银行发起提款，预期在回款到本合约时失败
    function withdrawFromBank(address bankAddr, uint256 amount) external {
        VulnerableBank(bankAddr).withdraw(amount);
    }

    /// @dev 拒绝接收 ETH
    fallback() external payable {
        revert("REJECT_ETH");
    }

    /// @dev 拒绝接收 ETH
    receive() external payable {
        revert("REJECT_ETH");
    }
}

