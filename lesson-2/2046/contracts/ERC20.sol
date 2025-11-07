pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";

/// @title 简单的 ERC20 实现（无需外部库）
/// @notice 基于定义好的 IERC20 接口进行实现，包含基础的 mint（在构造函数中）、转账与授权逻辑
contract ERC20 is IERC20 {
    // 代币名，例如 "MyToken"
    string public name;
    // 代币符号，例如 "MTK"
    string public symbol;
    // 小数位数，常用 18
    uint8 public decimals;
    // 总供应量（包含小数位）
    uint256 private _totalSupply;
    // 每个地址的余额映射
    mapping(address => uint256) private _balances;
    // 授权额度映射：owner => (spender => amount)
    mapping(address => mapping(address => uint256)) private _allowances;

    /// @dev 构造函数：部署时一次性铸造 initialSupply 到部署者地址
    /// @param _name 代币名称
    /// @param _symbol 代币符号
    /// @param _decimals 小数位数
    /// @param initialSupply 初始供应（以整数记，不包含小数位）
    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 initialSupply) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        // 将初始供应按小数位调整为真实 wei 单位
        _totalSupply = initialSupply * (10 ** uint256(decimals));
        // 将全部初始代币分配给部署者
        _balances[msg.sender] = _totalSupply;
        // 发出从零地址到部署者的 Transfer 事件表示铸造
        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    /// @notice 返回代币总供应量
    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    /// @notice 返回指定地址的代币余额
    /// @param account 查询的地址
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    /// @notice 从调用者地址向 recipient 转账 amount 代币
    /// @param recipient 接收者地址
    /// @param amount 转账数量（已包含小数位）
    /// @return success 布尔值表示操作是否成功
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        // 禁止转给零地址（通常用于销毁，非本实现允许）
        require(recipient != address(0), "ERC20: transfer to the zero address");
        // 检查余额是否足够
        require(_balances[msg.sender] >= amount, "ERC20: transfer amount exceeds balance");

        // 本地更新余额（注意：此处使用显式减法/加法）
        _balances[msg.sender] -= amount;
        _balances[recipient] += amount;
        // 发出 Transfer 事件
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    /// @notice 批准 spender 在调用者名下花费 amount 数量的代币
    /// @param spender 授权的地址
    /// @param amount 授权数量
    /// @return success 布尔值表示操作是否成功
    function approve(address spender, uint256 amount) public override returns (bool) {
        // 禁止授权给零地址（防止意外行为）
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[msg.sender][spender] = amount;
        // 发出 Approval 事件，标识新的授权额度
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /// @notice 在 sender 的名义下，将代币转给 recipient（需要先被授权）
    /// @param sender 代币原所有者
    /// @param recipient 接收者
    /// @param amount 转账数量
    /// @return success 布尔值表示操作是否成功
    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        // 校验输入地址合法性
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        // 检查 sender 余额是否足够
        require(_balances[sender] >= amount, "ERC20: transfer amount exceeds balance");
        // 检查调用者（msg.sender）是否有足够的授权额度
        require(_allowances[sender][msg.sender] >= amount, "ERC20: transfer amount exceeds allowance");

        // 更新余额与授权额度
        _balances[sender] -= amount;
        _balances[recipient] += amount;
        _allowances[sender][msg.sender] -= amount;
        // 发出转账事件
        emit Transfer(sender, recipient, amount);
        return true;
    }

    /// @notice 返回 owner 授权给 spender 的剩余额度
    /// @param owner 授权者
    /// @param spender 被授权者
    /// @return remaining 剩余的授权额度
    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }
}