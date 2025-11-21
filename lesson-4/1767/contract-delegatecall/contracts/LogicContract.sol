// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LogicContract
 * @dev 逻辑合约，包含实际的业务逻辑
 * 注意：状态变量的布局必须与代理合约保持一致
 */
contract LogicContract {
    // 状态变量必须与 ProxyContract 的布局完全一致
    uint256 public counter;
    address public owner;

    /**
     * @dev 增加计数器的值
     */
    function increment() public {
        counter += 1;
    }

    /**
     * @dev 获取当前计数器的值
     */
    function getCounter() public view returns (uint256) {
        return counter;
    }

    /**
     * @dev 设置计数器的值
     */
    function setCounter(uint256 _value) public {
        counter = _value;
    }
}
