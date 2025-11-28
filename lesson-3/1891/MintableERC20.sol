// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IMintableERC20.sol";

contract MintableERC20 is IMintableERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 initialSupply
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        owner = msg.sender;
        
        if (initialSupply > 0) {
            _totalSupply = initialSupply * (10 ** uint256(decimals));
            _balances[msg.sender] = _totalSupply;
            emit Transfer(address(0), msg.sender, _totalSupply);
        }
    }

    // 实现接口方法
    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(_balances[msg.sender] >= amount, "Insufficient balance");

        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    // Note: The parameter 'owner' in allowance() shadows the state variable 'owner'
    // This is intentional as it follows the ERC20 standard interface

    function approve(address spender, uint256 amount) external override returns (bool) {
        require(spender != address(0), "Approve to zero address");

        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(_balances[from] >= amount, "Insufficient balance");
        require(_allowances[from][msg.sender] >= amount, "Allowance exceeded");

        _balances[from] -= amount;
        _balances[to] += amount;
        _allowances[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }

    // Mint函数 - 只有owner可以调用
    function mint(address to, uint256 amount) external override onlyOwner returns (bool) {
        require(to != address(0), "Mint to zero address");
        require(amount > 0, "Mint amount must be greater than 0");

        _totalSupply += amount;
        _balances[to] += amount;
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        return true;
    }

    // Burn函数 - 任何人都可以销毁自己的代币
    function burn(uint256 amount) external override returns (bool) {
        require(amount > 0, "Burn amount must be greater than 0");
        require(_balances[msg.sender] >= amount, "Insufficient balance to burn");

        _balances[msg.sender] -= amount;
        _totalSupply -= amount;
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        return true;
    }

    // BurnFrom函数 - 从授权的账户销毁代币
    function burnFrom(address from, uint256 amount) external override returns (bool) {
        require(from != address(0), "Burn from zero address");
        require(amount > 0, "Burn amount must be greater than 0");
        require(_balances[from] >= amount, "Insufficient balance to burn");
        require(_allowances[from][msg.sender] >= amount, "Allowance exceeded");

        _balances[from] -= amount;
        _totalSupply -= amount;
        _allowances[from][msg.sender] -= amount;
        emit Burn(from, amount);
        emit Transfer(from, address(0), amount);
        return true;
    }
}
