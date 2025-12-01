// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MyERC20 {
    // 状态变量
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;

    // 余额映射: 地址 => 余额
    mapping(address => uint256) public balanceOf;
    // 授权映射: 拥有者 => (被授权人 => 金额)
    mapping(address => mapping(address => uint256)) public allowance;

    // 事件定义
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // 构造函数：初始化代币名称、符号和初始供应量
    constructor(string memory _name, string memory _symbol, uint256 _totalSupply) {
        name = _name;
        symbol = _symbol;
        // 将初始供应量全部给部署者
        totalSupply = _totalSupply * (10 ** uint256(decimals));
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    // 转账功能
    function transfer(address to, uint256 value) public returns (bool success) {
        require(to != address(0), "ERC20: transfer to the zero address");
        require(balanceOf[msg.sender] >= value, "ERC20: transfer amount exceeds balance");

        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        
        emit Transfer(msg.sender, to, value);
        return true;
    }

    // 授权功能
    function approve(address spender, uint256 value) public returns (bool success) {
        require(spender != address(0), "ERC20: approve to the zero address");
        
        allowance[msg.sender][spender] = value;
        
        emit Approval(msg.sender, spender, value);
        return true;
    }

    // 授权转账功能 (用于第三方调用，如DEX)
    function transferFrom(address from, address to, uint256 value) public returns (bool success) {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        require(balanceOf[from] >= value, "ERC20: transfer amount exceeds balance");
        require(allowance[from][msg.sender] >= value, "ERC20: transfer amount exceeds allowance");

        // 扣除授权额度
        allowance[from][msg.sender] -= value;
        
        // 执行转账
        balanceOf[from] -= value;
        balanceOf[to] += value;

        emit Transfer(from, to, value);
        return true;
    }
}