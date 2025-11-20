// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC20.sol";

/**
 * @title MyERC20
 * @dev Implementation of the ERC20 token standard
 */
contract MyERC20 is IERC20 {
    // Token name
    string public name;
    
    // Token symbol
    string public symbol;
    
    // Token decimals
    uint8 public decimals;
    
    // Total supply of tokens
    uint256 private _totalSupply;
    
    // Mapping from address to balance
    mapping(address => uint256) private _balances;
    
    // Mapping from owner to spender to allowance
    mapping(address => mapping(address => uint256)) private _allowances;
    
    /**
     * @dev Constructor that initializes the token
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _decimals Token decimals
     * @param _initialSupply Initial supply of tokens
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
     * @dev Returns the total supply of tokens
     * @return The total supply of tokens
     */
    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }
    
    /**
     * @dev Returns the balance of the specified address
     * @param account The address to query the balance of
     * @return The balance of the specified address
     */
    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }
    
    /**
     * @dev Moves `amount` tokens from the caller's account to `to`
     * @param to The address to transfer tokens to
     * @param amount The amount of tokens to transfer
     * @return A boolean value indicating whether the operation succeeded
     */
    function transfer(address to, uint256 amount) external override returns (bool) {
        require(to != address(0), "ERC20: transfer to the zero address");
        require(_balances[msg.sender] >= amount, "ERC20: insufficient balance");
        
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @dev Returns the amount of tokens that an owner allowed to a spender
     * @param owner The address which owns the funds
     * @param spender The address which will spend the funds
     * @return The amount of tokens still available for the spender
     */
    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }
    
    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens
     * @param spender The address which will spend the funds
     * @param amount The amount of tokens to be spent
     * @return A boolean value indicating whether the operation succeeded
     */
    function approve(address spender, uint256 amount) external override returns (bool) {
        require(spender != address(0), "ERC20: approve to the zero address");
        
        _allowances[msg.sender][spender] = amount;
        
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    /**
     * @dev Moves `amount` tokens from `from` to `to` using the allowance mechanism
     * @param from The address to transfer tokens from
     * @param to The address to transfer tokens to
     * @param amount The amount of tokens to transfer
     * @return A boolean value indicating whether the operation succeeded
     */
    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        require(_balances[from] >= amount, "ERC20: insufficient balance");
        require(_allowances[from][msg.sender] >= amount, "ERC20: insufficient allowance");
        
        _balances[from] -= amount;
        _balances[to] += amount;
        _allowances[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
}

