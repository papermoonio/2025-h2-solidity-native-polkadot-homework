// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Mintable ERC20 (no external libraries)
 * @dev Standard ERC20 with owner-controlled minter role and mint function.
 */
contract MintableERC20 {
	string public name;
	string public symbol;
	uint8 public immutable decimals;

	address public owner;
	mapping(address => bool) public isMinter;

	uint256 private _totalSupply;
	mapping(address => uint256) private _balances;
	mapping(address => mapping(address => uint256)) private _allowances;

	event Transfer(address indexed from, address indexed to, uint256 value);
	event Approval(address indexed owner, address indexed spender, uint256 value);
	event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
	event MinterAdded(address indexed account);
	event MinterRemoved(address indexed account);

	modifier onlyOwner() {
		require(msg.sender == owner, "Ownable: caller is not the owner");
		_;
	}

	modifier onlyMinter() {
		require(isMinter[msg.sender], "Mintable: caller is not a minter");
		_;
	}

	constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 initialSupply) {
		name = _name;
		symbol = _symbol;
		decimals = _decimals;
		owner = msg.sender;
		emit OwnershipTransferred(address(0), msg.sender);
		_addMinter(msg.sender);
		_mint(msg.sender, initialSupply);
	}

	function totalSupply() external view returns (uint256) {
		return _totalSupply;
	}

	function balanceOf(address account) external view returns (uint256) {
		return _balances[account];
	}

	function transfer(address to, uint256 amount) external returns (bool) {
		_transfer(msg.sender, to, amount);
		return true;
	}

	function allowance(address _owner, address spender) external view returns (uint256) {
		return _allowances[_owner][spender];
	}

	function approve(address spender, uint256 amount) external returns (bool) {
		_approve(msg.sender, spender, amount);
		return true;
	}

	function transferFrom(address from, address to, uint256 amount) external returns (bool) {
		uint256 currentAllowance = _allowances[from][msg.sender];
		require(currentAllowance >= amount, "ERC20: insufficient allowance");
		unchecked {
			_approve(from, msg.sender, currentAllowance - amount);
		}
		_transfer(from, to, amount);
		return true;
	}

	function increaseAllowance(address spender, uint256 addedValue) external returns (bool) {
		_approve(msg.sender, spender, _allowances[msg.sender][spender] + addedValue);
		return true;
	}

	function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool) {
		uint256 currentAllowance = _allowances[msg.sender][spender];
		require(currentAllowance >= subtractedValue, "ERC20: decreased below zero");
		unchecked {
			_approve(msg.sender, spender, currentAllowance - subtractedValue);
		}
		return true;
	}

	// Minting controls
	function addMinter(address account) external onlyOwner {
		_addMinter(account);
	}

	function removeMinter(address account) external onlyOwner {
		require(isMinter[account], "Mintable: not a minter");
		isMinter[account] = false;
		emit MinterRemoved(account);
	}

	function mint(address to, uint256 amount) external onlyMinter {
		_mint(to, amount);
	}

	// Ownership
	function transferOwnership(address newOwner) external onlyOwner {
		require(newOwner != address(0), "Ownable: new owner is the zero address");
		address previous = owner;
		owner = newOwner;
		emit OwnershipTransferred(previous, newOwner);
	}

	// Internal ERC20 helpers
	function _transfer(address from, address to, uint256 amount) internal {
		require(from != address(0), "ERC20: transfer from zero address");
		require(to != address(0), "ERC20: transfer to zero address");
		uint256 fromBalance = _balances[from];
		require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
		unchecked {
			_balances[from] = fromBalance - amount;
		}
		_balances[to] += amount;
		emit Transfer(from, to, amount);
	}

	function _approve(address _owner, address spender, uint256 amount) internal {
		require(_owner != address(0), "ERC20: approve from zero address");
		require(spender != address(0), "ERC20: approve to zero address");
		_allowances[_owner][spender] = amount;
		emit Approval(_owner, spender, amount);
	}

	function _mint(address to, uint256 amount) internal {
		require(to != address(0), "ERC20: mint to zero address");
		_totalSupply += amount;
		_balances[to] += amount;
		emit Transfer(address(0), to, amount);
	}

	function _addMinter(address account) internal {
		require(account != address(0), "Mintable: minter is zero address");
		require(!isMinter[account], "Mintable: already minter");
		isMinter[account] = true;
		emit MinterAdded(account);
	}
}


