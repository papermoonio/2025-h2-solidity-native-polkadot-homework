// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ERC20.sol";

/**
 * @title MyToken
 * @dev 一个简单的 ERC20 代币实现示例
 */
contract MyToken is ERC20 {
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply
    ) ERC20(_name, _symbol, _decimals, _initialSupply) {}
}

