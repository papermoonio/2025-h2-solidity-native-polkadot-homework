// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IERC20.sol";

/**
 * @title ERC20 Token Implementation
 * @dev 实现了 ERC20 代币标准，不使用外部库
 */
contract ERC20 is IERC20 {
    // 代币名称
    string public name;
    // 代币符号
    string public symbol;
    // 代币精度（小数位数）
    uint8 public decimals;
    // 代币总供应量
    uint256 private _totalSupply;
    
    // 账户余额映射
    mapping(address => uint256) private _balances;
    
    // 授权额度映射：owner => (spender => amount)
    mapping(address => mapping(address => uint256)) private _allowances;

    /**
     * @dev 构造函数
     * @param _name 代币名称
     * @param _symbol 代币符号
     * @param _decimals 代币精度
     * @param _initialSupply 初始供应量（单位为最小单位，不考虑精度）
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        _totalSupply = _initialSupply;
        _balances[msg.sender] = _initialSupply;
        emit Transfer(address(0), msg.sender, _initialSupply);
    }

    /**
     * @dev 返回代币的总供应量
     */
    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev 返回指定账户的代币余额
     * @param account 要查询余额的账户地址
     */
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev 将指定数量的代币转移到指定地址
     * @param to 接收代币的地址
     * @param amount 要转移的代币数量
     * @return 如果转移成功返回 true
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        address owner = msg.sender;
        _transfer(owner, to, amount);
        return true;
    }

    /**
     * @dev 返回 spender 被 owner 授权可以花费的代币数量
     * @param owner 代币拥有者地址
     * @param spender 被授权花费代币的地址
     */
    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev 授权 spender 可以使用调用者的代币，数量为 amount
     * @param spender 被授权花费代币的地址
     * @param amount 授权的代币数量
     * @return 如果授权成功返回 true
     * 
     * 注意：根据 ERC20 标准，如果之前有授权，应该先设置为 0 再设置新值，或者使用 increaseAllowance/decreaseAllowance
     * 这里实现标准的 approve 函数
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        address owner = msg.sender;
        _approve(owner, spender, amount);
        return true;
    }

    /**
     * @dev 从 from 地址转移 amount 数量的代币到 to 地址
     * 调用者必须有足够的授权额度
     * @param from 代币来源地址
     * @param to 接收代币的地址
     * @param amount 要转移的代币数量
     * @return 如果转移成功返回 true
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        address spender = msg.sender;
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @dev 内部转账函数
     * @param from 代币来源地址
     * @param to 接收代币的地址
     * @param amount 要转移的代币数量
     */
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
        
        unchecked {
            _balances[from] = fromBalance - amount;
            _balances[to] += amount;
        }

        emit Transfer(from, to, amount);
    }

    /**
     * @dev 内部授权函数
     * @param owner 代币拥有者地址
     * @param spender 被授权花费代币的地址
     * @param amount 授权的代币数量
     */
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * @dev 内部函数：消耗授权额度
     * @param owner 代币拥有者地址
     * @param spender 被授权花费代币的地址
     * @param amount 要消耗的代币数量
     */
    function _spendAllowance(address owner, address spender, uint256 amount) internal {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }

    /**
     * @dev 铸造代币（仅用于测试或特殊用途）
     * @param to 接收代币的地址
     * @param amount 要铸造的代币数量
     */
    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "ERC20: mint to the zero address");

        _totalSupply += amount;
        unchecked {
            _balances[to] += amount;
        }
        emit Transfer(address(0), to, amount);
    }

    /**
     * @dev 销毁代币
     * @param from 要销毁代币的地址
     * @param amount 要销毁的代币数量
     */
    function _burn(address from, uint256 amount) internal {
        require(from != address(0), "ERC20: burn from the zero address");

        uint256 accountBalance = _balances[from];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[from] = accountBalance - amount;
            _totalSupply -= amount;
        }

        emit Transfer(from, address(0), amount);
    }
}

