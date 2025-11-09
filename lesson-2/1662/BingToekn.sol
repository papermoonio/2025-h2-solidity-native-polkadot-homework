// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title  Simple ERC20 token "Bing" (symbol B) — no external libraries
/// @notice  Total supply = 1,000,000 * 10**decimals, minted to deployer
contract BingToken {
    // ERC20 basic data
    string public name = "Bing";
    string public symbol = "B";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    // balances and allowances
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Events as per ERC20
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /// @notice Constructor mints total supply to deployer
    constructor() {
        uint256 initial = 1_000_000; // 1,000,000 tokens
        totalSupply = initial * (10 ** uint256(decimals));
        _balances[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    /// @notice Returns balance of account
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    /// @notice Transfer tokens to `to`
    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /// @notice Returns current allowance
    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    /// @notice Approve spender
    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /// @notice Transfer from `from` to `to` using allowance
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        _approve(from, msg.sender, currentAllowance - amount);
        _transfer(from, to, amount);
        return true;
    }

    /// @notice Increase allowance safely
    function increaseAllowance(address spender, uint256 addedValue) external returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender] + addedValue);
        return true;
    }

    /// @notice Decrease allowance safely
    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool) {
        uint256 current = _allowances[msg.sender][spender];
        require(current >= subtractedValue, "ERC20: decreased allowance below zero");
        _approve(msg.sender, spender, current - subtractedValue);
        return true;
    }

    // ---- Internal helpers ----
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from zero");
        require(to != address(0), "ERC20: transfer to zero");
        uint256 senderBalance = _balances[from];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");

        _balances[from] = senderBalance - amount;
        _balances[to] += amount;

        emit Transfer(from, to, amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from zero");
        require(spender != address(0), "ERC20: approve to zero");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}
