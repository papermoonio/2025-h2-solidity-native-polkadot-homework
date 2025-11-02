// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ERC20 Interface
 * @dev Standard ERC20 Token Interface
 */
interface IERC20 {
    /**
     * @dev Returns the total supply of tokens
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the balance of the specified address
     * @param account The address to query the balance of
     * @return The balance of the specified address
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Transfers tokens from the caller's account to the specified recipient
     * @param to The address to transfer to
     * @param amount The amount to be transferred
     * @return A boolean value indicating whether the operation succeeded
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @dev Returns the amount of tokens that an owner allowed to a spender
     * @param owner The address which owns the funds
     * @param spender The address which will spend the funds
     * @return The amount of tokens available for the spender
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Approves the spender to spend the specified amount of tokens on behalf of the caller
     * @param spender The address which will spend the funds
     * @param amount The amount of tokens to be spent
     * @return A boolean value indicating whether the operation succeeded
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Transfers tokens from one address to another using the allowance mechanism
     * @param from The address which you want to send tokens from
     * @param to The address which you want to transfer to
     * @param amount The amount of tokens to be transferred
     * @return A boolean value indicating whether the operation succeeded
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to another (`to`)
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by a call to `approve`
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

