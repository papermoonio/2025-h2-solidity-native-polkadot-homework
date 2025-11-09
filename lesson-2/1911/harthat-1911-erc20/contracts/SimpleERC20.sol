// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract SimpleERC20 {
  // 代币元数据
  string public name;
  string public symbol;
  uint8 public constant decimals = 18;

  // ERC20 状态变量
  uint256 public totalSupply;
  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;

  // 简单所有权，用于控制铸造/销毁权限
  address public owner;

  // ERC20 标准事件
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);

  // 仅所有者可调用修饰符
  modifier onlyOwner() {
    require(msg.sender == owner, "Only owner");
    _;
  }

  // 构造函数：设置名称/符号，并可一次性铸造初始供应给部署者
  constructor(string memory name_, string memory symbol_, uint256 initialSupply) {
    owner = msg.sender;
    name = name_;
    symbol = symbol_;
    if (initialSupply > 0) {
      _mint(msg.sender, initialSupply);
    }
  }

  // 转账：从 msg.sender 向接收者转移 amount 数量的代币
  function transfer(address to, uint256 amount) public returns (bool) {
    _transfer(msg.sender, to, amount);
    return true;
  }

  // 授权：允许 spender 消耗 msg.sender 的 amount 数量代币
  function approve(address spender, uint256 amount) public returns (bool) {
    _approve(msg.sender, spender, amount);
    return true;
  }

  // 代扣转账：使用调用者已有的授权，从 from 转移 amount 到 to
  function transferFrom(address from, address to, uint256 amount) public returns (bool) {
    uint256 currentAllowance = allowance[from][msg.sender];
    require(currentAllowance >= amount, "ERC20: insufficient allowance");
    unchecked {
      // safe in solidity ^0.8 due to prior require
      allowance[from][msg.sender] = currentAllowance - amount;
    }
    _transfer(from, to, amount);
    return true;
  }

  // 铸造：仅所有者可调用，向地址 to 铸造 amount 代币
  function mint(address to, uint256 amount) public onlyOwner returns (bool) {
    _mint(to, amount);
    return true;
  }

  // 销毁：仅所有者可调用，从地址 from 销毁 amount 代币
  function burn(address from, uint256 amount) public onlyOwner returns (bool) {
    _burn(from, amount);
    return true;
  }

  // 内部转账逻辑：余额检查、地址检查、更新余额并发出事件
  function _transfer(address from, address to, uint256 amount) internal {
    require(from != address(0), "ERC20: transfer from zero address");
    require(to != address(0), "ERC20: transfer to zero address");
    uint256 fromBalance = balanceOf[from];
    require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
    unchecked {
      balanceOf[from] = fromBalance - amount;
    }
    balanceOf[to] += amount;
    emit Transfer(from, to, amount);
  }

  // 内部授权逻辑：设置授权额度并发出事件
  function _approve(address owner_, address spender, uint256 amount) internal {
    require(owner_ != address(0), "ERC20: approve from zero address");
    require(spender != address(0), "ERC20: approve to zero address");
    allowance[owner_][spender] = amount;
    emit Approval(owner_, spender, amount);
  }

  // 内部铸造逻辑：增加总供应与接收者余额，发出从零地址的转账事件
  function _mint(address to, uint256 amount) internal {
    require(to != address(0), "ERC20: mint to zero address");
    totalSupply += amount;
    balanceOf[to] += amount;
    emit Transfer(address(0), to, amount);
  }

  // 内部销毁逻辑：减少总供应与来源余额，发出到零地址的转账事件
  function _burn(address from, uint256 amount) internal {
    require(from != address(0), "ERC20: burn from zero address");
    uint256 fromBalance = balanceOf[from];
    require(fromBalance >= amount, "ERC20: burn amount exceeds balance");
    unchecked {
      balanceOf[from] = fromBalance - amount;
      totalSupply -= amount;
    }
    emit Transfer(from, address(0), amount);
  }
}


