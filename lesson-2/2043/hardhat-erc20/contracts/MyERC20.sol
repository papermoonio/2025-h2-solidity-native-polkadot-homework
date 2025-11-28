// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MyERC20 合约
 */
contract MyERC20 {
    // 代币元数据
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    // 代币余额和总供应量
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    // 授权额度：所有者 => 支出者 => 金额
    mapping(address => mapping(address => uint256)) private _allowances;

    // 事件
    // 当代币转账时触发（包括铸造和销毁）
    event Transfer(address indexed from, address indexed to, uint256 value);
    // 当授权额度发生变化时触发
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    /**
     * 构造函数，设置代币名称、符号和初始供应量
     */
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

    /**
     * 返回代币名称
     */
    function name() public view returns (string memory) {
        return _name;
    }

    /**
     * 返回代币符号
     */
    function symbol() public view returns (string memory) {
        return _symbol;
    }

    /**
     * 返回代币使用的小数位数
     */
    function decimals() public view returns (uint8) {
        return _decimals;
    }

    /**
     * 返回代币总供应量
     */
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    /**
     * 返回账户余额
     */
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    /**
     * 向指定地址转账
     */
    function transfer(address to, uint256 amount) public returns (bool) {
        address owner = msg.sender;
        _transfer(owner, to, amount);
        return true;
    }

   
   /**
    * 设置支出者可以从调用者账户支出的代币数量
    */
    function approve(address spender, uint256 amount) public returns (bool) {
        address owner = msg.sender;
        _approve(owner, spender, amount);
        return true;
    }

    /**
     * 使用授权机制从一个地址向另一个地址转账
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public returns (bool) {
        address spender = msg.sender;
        uint256 currentAllowance = _allowances[from][spender];
        if (currentAllowance != type(uint256).max) {
            require(
                    currentAllowance >= amount,
                    "MyERC20: insufficient allowance"
                );
            unchecked {
                _approve(from, spender, currentAllowance - amount);
            }
        }
        
        _transfer(from, to, amount);
        return true;
    }

    

    /**
     * 内部转账函数
     */
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "MyERC20: transfer from the zero address");
        require(to != address(0), "MyERC20: transfer to the zero address");

        uint256 fromBalance = _balances[from];
       require(
            fromBalance >= amount,
            "MyERC20: transfer amount exceeds balance"
        );

        unchecked {
            _balances[from] = fromBalance - amount;
            // 不可能溢出：amount <= fromBalance <= totalSupply
            _balances[to] += amount;
        }

        emit Transfer(from, to, amount);
    }

  /**
   * 创建代币并分配给指定账户
   */
    function _mint(address account, uint256 amount) internal {
         require(account != address(0), "MyERC20: mint to the zero address");

        _totalSupply += amount;
        unchecked {
            // 不可能溢出：余额 + 金额最多为总供应量 + 金额
            _balances[account] += amount;
        }
        emit Transfer(address(0), account, amount);
    }

 
   /**
    * 设置支出者可以从所有者账户支出的代币数量
    */
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "MyERC20: approve from the zero address");
        require(spender != address(0), "myERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * 返回授权金额用于测试
     */

  function allowance(
        address owner,
        address spender
    ) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    
}