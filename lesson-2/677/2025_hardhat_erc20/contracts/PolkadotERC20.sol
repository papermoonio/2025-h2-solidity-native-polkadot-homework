// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Polkadot ERC20 Token
 * @dev 為Polkadot項目創建的標準ERC20代幣實現
 */
contract PolkadotERC20 {
    // 代幣基本信息
    string private _name;
    string private _symbol;
    uint8 private _decimals;
    
    // 總供應量
    uint256 private _totalSupply;
    
    // 餘額映射
    mapping(address => uint256) private _balances;
    
    // 授權映射
    mapping(address => mapping(address => uint256)) private _allowances;
    
    // 事件
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    // 管理員地址
    address private _owner;
    
    /**
     * @dev 構造函數，初始化代幣
     * @param name_ 代幣名稱
     * @param symbol_ 代幣符號
     * @param decimals_ 小數位數
     * @param initialSupply 初始供應量
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply
    ) {
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
        _owner = msg.sender;
        
        // 將初始供應量分配給部署者
        _totalSupply = initialSupply * 10**decimals_;
        _balances[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
    }
    
    /**
     * @dev 返回代幣名稱
     */
    function name() public view returns (string memory) {
        return _name;
    }
    
    /**
     * @dev 返回代幣符號
     */
    function symbol() public view returns (string memory) {
        return _symbol;
    }
    
    /**
     * @dev 返回小數位數
     */
    function decimals() public view returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev 返回總供應量
     */
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }
    
    /**
     * @dev 返回賬戶餘額
     * @param account 要查詢的地址
     */
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }
    
    /**
     * @dev 轉賬功能
     * @param to 接收地址
     * @param amount 轉賬金額
     */
    function transfer(address to, uint256 amount) public returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @dev 查詢授權額度
     * @param owner 持有者地址
     * @param spender 被授權地址
     */
    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }
    
    /**
     * @dev 授權功能
     * @param spender 被授權地址
     * @param amount 授權金額
     */
    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    
    /**
     * @dev 從授權地址轉賬
     * @param from 轉出地址
     * @param to 接收地址
     * @param amount 轉賬金額
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, amount);
        return true;
    }
    
    /**
     * @dev 內部轉賬實現
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal {
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
     * @dev 內部授權實現
     */
    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    
    /**
     * @dev 消費授權額度
     */
    function _spendAllowance(
        address owner,
        address spender,
        uint256 amount
    ) internal {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }
    
    /**
     * @dev 鑄幣功能 - 僅管理員可調用
     * @param to 接收地址
     * @param amount 鑄幣金額
     */
    function mint(address to, uint256 amount) public {
        require(msg.sender == _owner, "ERC20: only owner can mint");
        require(to != address(0), "ERC20: mint to the zero address");
        
        _totalSupply += amount;
        unchecked {
            _balances[to] += amount;
        }
        emit Transfer(address(0), to, amount);
    }
    
    /**
     * @dev 銷毀功能
     * @param amount 銷毀金額
     */
    function burn(uint256 amount) public {
        address account = msg.sender;
        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        
        unchecked {
            _balances[account] = accountBalance - amount;
            _totalSupply -= amount;
        }
        
        emit Transfer(account, address(0), amount);
    }
    
    /**
     * @dev 返回合約所有者
     */
    function owner() public view returns (address) {
        return _owner;
    }
    
    /**
     * @dev 轉移所有權
     * @param newOwner 新所有者地址
     */
    function transferOwnership(address newOwner) public {
        require(msg.sender == _owner, "ERC20: only owner can transfer ownership");
        require(newOwner != address(0), "ERC20: new owner is the zero address");
        _owner = newOwner;
    }
}