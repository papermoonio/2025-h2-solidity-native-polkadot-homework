// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Minimal ERC-20 token implementation (no OpenZeppelin)
/// @author GPT-5
/// @notice Implements the ERC-20 standard per EIP-20
contract ERC20 {
    // --- Events (per EIP-20)
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    // --- Storage
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // --- Constructor
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_
    ) {
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
        if (initialSupply_ > 0) {
            _mint(msg.sender, initialSupply_);
        }
    }

    // --- Public view functions
    function name() external view returns (string memory) {
        return _name;
    }

    function symbol() external view returns (string memory) {
        return _symbol;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function allowance(
        address owner_,
        address spender
    ) public view returns (uint256) {
        return _allowances[owner_][spender];
    }

    // --- Core ERC-20 functions
    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        if (currentAllowance < value) revert InsufficientAllowance();
        unchecked {
            _approve(from, msg.sender, currentAllowance - value);
        }
        _transfer(from, to, value);
        return true;
    }

    // --- Optional helpers (commonly used)
    function increaseAllowance(
        address spender,
        uint256 addedValue
    ) external returns (bool) {
        _approve(
            msg.sender,
            spender,
            _allowances[msg.sender][spender] + addedValue
        );
        return true;
    }

    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    ) external returns (bool) {
        uint256 current = _allowances[msg.sender][spender];
        if (current < subtractedValue) revert InsufficientAllowance();
        unchecked {
            _approve(msg.sender, spender, current - subtractedValue);
        }
        return true;
    }

    // --- Custom errors
    error ZeroAddress();
    error InsufficientBalance();
    error InsufficientAllowance();

    // --- Internal logic
    function _transfer(address from, address to, uint256 value) internal {
        if (from == address(0) || to == address(0)) revert ZeroAddress();
        uint256 fromBalance = _balances[from];
        if (fromBalance < value) revert InsufficientBalance();
        unchecked {
            _balances[from] = fromBalance - value;
        }
        _balances[to] += value;
        emit Transfer(from, to, value);
    }

    function _approve(address owner_, address spender, uint256 value) internal {
        if (owner_ == address(0) || spender == address(0)) revert ZeroAddress();
        _allowances[owner_][spender] = value;
        emit Approval(owner_, spender, value);
    }

    function _mint(address to, uint256 value) internal {
        if (to == address(0)) revert ZeroAddress();
        _totalSupply += value;
        _balances[to] += value;
        emit Transfer(address(0), to, value);
    }

    function _burn(address from, uint256 value) internal {
        if (from == address(0)) revert ZeroAddress();
        uint256 fromBalance = _balances[from];
        if (fromBalance < value) revert InsufficientBalance();
        unchecked {
            _balances[from] = fromBalance - value;
            _totalSupply -= value;
        }
        emit Transfer(from, address(0), value);
    }
}
