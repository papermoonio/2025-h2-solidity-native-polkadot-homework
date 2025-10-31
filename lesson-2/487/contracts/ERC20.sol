// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IERC20.sol";

/**
 * @title ERC20 Token Implementation
 * @dev 完全自主实现的 ERC20 代币合约，不依赖任何外部库
 * @notice 实现了 ERC20 标准的所有必需功能
 */
contract ERC20 is IERC20 {
    // 代币元数据
    string public name;
    string public symbol;
    uint8 public decimals;

    // 总供应量
    uint256 private _totalSupply;

    // 余额映射：地址 => 余额
    mapping(address => uint256) private _balances;

    // 授权映射：所有者 => (被授权者 => 授权数量)
    mapping(address => mapping(address => uint256)) private _allowances;

    /**
     * @dev 构造函数，初始化代币
     * @param _name 代币名称
     * @param _symbol 代币符号
     * @param _decimals 小数位数
     * @param _initialSupply 初始供应量（完整代币单位，会自动乘以 10^decimals）
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
        _totalSupply = _initialSupply * (10 ** uint256(_decimals));
        _balances[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    /**
     * @dev 返回代币的总供应量
     * @return 总供应量
     */
    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev 返回指定账户的代币余额
     * @param account 要查询的账户地址
     * @return 账户的代币余额
     */
    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev 返回 spender 被授权从 owner 账户中花费的代币数量
     * @param owner 代币所有者地址
     * @param spender 被授权的地址
     * @return 剩余授权数量
     */
    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev 将指定数量的代币从调用者地址转移到 recipient
     * @param recipient 接收者地址
     * @param amount 要转移的代币数量
     * @return 操作是否成功
     */
    function transfer(address recipient, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    /**
     * @dev 授权 spender 可以从调用者账户中花费最多 amount 的代币
     * @param spender 被授权的地址
     * @param amount 授权的代币数量
     * @return 操作是否成功
     */
    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /**
     * @dev 从 sender 账户转移 amount 代币到 recipient
     * @dev 调用者必须有足够的授权额度
     * @param sender 代币来源地址
     * @param recipient 接收者地址
     * @param amount 要转移的代币数量
     * @return 操作是否成功
     */
    function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
        uint256 currentAllowance = _allowances[sender][msg.sender];
        require(currentAllowance >= amount, "ERC20: insufficient allowance");
        
        // 先减少授权额度，防止重入攻击
        unchecked {
            _approve(sender, msg.sender, currentAllowance - amount);
        }
        
        _transfer(sender, recipient, amount);
        return true;
    }

    /**
     * @dev 内部转账函数，实现代币转移逻辑
     * @param from 发送者地址
     * @param to 接收者地址
     * @param amount 转移数量
     */
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
        
        unchecked {
            _balances[from] = fromBalance - amount;
        }
        _balances[to] += amount;

        emit Transfer(from, to, amount);
    }

    /**
     * @dev 内部授权函数，设置授权额度
     * @param owner 代币所有者地址
     * @param spender 被授权的地址
     * @param amount 授权的代币数量
     */
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * @dev 内部铸造函数，增加总供应量并向指定账户分配代币
     * @param account 接收代币的账户
     * @param amount 铸造的代币数量
     */
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply += amount;
        unchecked {
            _balances[account] += amount;
        }
        emit Transfer(address(0), account, amount);
    }

    /**
     * @dev 内部销毁函数，减少总供应量并销毁指定账户的代币
     * @param account 代币来源账户
     * @param amount 销毁的代币数量
     */
    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: burn from the zero address");

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        
        unchecked {
            _balances[account] = accountBalance - amount;
            _totalSupply -= amount;
        }

        emit Transfer(account, address(0), amount);
    }
}
