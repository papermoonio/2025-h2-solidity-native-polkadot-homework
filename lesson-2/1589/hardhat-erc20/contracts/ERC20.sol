// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract ERC20 {
  string public name;
  string public symbol;
  uint8 public decimals;
  uint256 public totalSupply;

  mapping(address => uint256) private balances;
  mapping(address => mapping(address => uint256)) private allowances;

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);

  constructor(string memory name_, string memory symbol_, uint256 initialSupply_) {
    name = name_;
    symbol = symbol_;
    decimals = 18;
    totalSupply = initialSupply_;
    balances[msg.sender] = initialSupply_;
    emit Transfer(address(0), msg.sender, initialSupply_);
  }

  function balanceOf(address account) public view returns (uint256) {
    return balances[account];
  }

  function allowance(address owner, address spender) public view returns (uint256) {
    return allowances[owner][spender];
  }

  function transfer(address to, uint256 amount) public returns (bool) {
    require(to != address(0), "transfer to zero address");
    uint256 fromBalance = balances[msg.sender];
    require(fromBalance >= amount, "insufficient balance");
    unchecked {
      balances[msg.sender] = fromBalance - amount;
    }
    balances[to] += amount;
    emit Transfer(msg.sender, to, amount);
    return true;
  }

  function approve(address spender, uint256 amount) public returns (bool) {
    require(spender != address(0), "approve to zero address");
    allowances[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(address from, address to, uint256 amount) public returns (bool) {
    require(from != address(0), "transfer from zero address");
    require(to != address(0), "transfer to zero address");
    uint256 fromBalance = balances[from];
    require(fromBalance >= amount, "insufficient balance");
    uint256 allowed = allowances[from][msg.sender];
    require(allowed >= amount, "insufficient allowance");
    unchecked {
      allowances[from][msg.sender] = allowed - amount;
      balances[from] = fromBalance - amount;
    }
    balances[to] += amount;
    emit Transfer(from, to, amount);
    return true;
  }
}