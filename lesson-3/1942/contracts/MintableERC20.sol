// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MintableERC20
 * @notice ERC20 token where the contract owner can mint new tokens.
 * @dev Uses OpenZeppelin ERC20 and Ownable (v5). Decimals default to 18.
 */
contract MintableERC20 is ERC20, Ownable {
    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint256 initialSupply,
        address initialReceiver
    ) ERC20(tokenName, tokenSymbol) Ownable(msg.sender) {
        address receiver = initialReceiver == address(0) ? msg.sender : initialReceiver;
        if (initialSupply > 0) {
            _mint(receiver, initialSupply);
        }
    }

    /**
     * @notice Mint new tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (in wei units of the token)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}


