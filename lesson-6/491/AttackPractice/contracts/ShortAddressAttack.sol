// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title VulnerableToken
 * @notice This contract demonstrates a short address attack vulnerability.
 * The standard ERC20 transfer function is vulnerable if the recipient address
 * is shorter than 20 bytes (40 hex characters).
 * 
 * Attack Principle:
 * When a short address (19 bytes instead of 20) is used, the EVM pads it with zeros.
 * This causes the amount parameter to shift, effectively multiplying it by 256.
 * For example: transfer(0x1234...567, 100) becomes transfer(0x1234...56700, 25600)
 */
contract VulnerableToken is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }

    /**
     * @notice Standard ERC20 transfer - vulnerable to short address attack
     * @dev VULNERABLE: No validation of address length
     *      If 'to' is 19 bytes instead of 20, the amount will be shifted left by 8 bits
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        // VULNERABILITY: No check for address length
        // If 'to' is 19 bytes, EVM will pad with 0, causing amount to shift
        return super.transfer(to, amount);
    }

    /**
     * @notice Standard ERC20 transferFrom - also vulnerable
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        // VULNERABILITY: Same issue as transfer
        return super.transferFrom(from, to, amount);
    }
}

/**
 * @title SafeToken
 * @notice This contract demonstrates how to prevent short address attacks
 */
contract SafeToken is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }

    /**
     * @notice Safe transfer with address validation
     * @dev MITIGATION: Rejects addresses ending in 0x00 (short address attack vector)
     *      Note: This is a simple mitigation. In practice, modern wallets/libraries
     *      prevent short address attacks at the encoding level.
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        // MITIGATION: Reject addresses ending in 0x00 (potential short address)
        // This prevents the most common short address attack vector
        require(to != address(0), "Cannot transfer to zero address");
        require(uint160(to) & 0xFF != 0, "Address ends in 0x00 - potential short address attack");
        return super.transfer(to, amount);
    }

    /**
     * @notice Safe transferFrom with address validation
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        // MITIGATION: Validate both addresses don't end in 0x00
        require(uint160(from) & 0xFF != 0, "From address ends in 0x00");
        require(to != address(0), "Cannot transfer to zero address");
        require(uint160(to) & 0xFF != 0, "To address ends in 0x00 - potential short address attack");
        return super.transferFrom(from, to, amount);
    }
}

/**
 * @title ShortAddressAttacker
 * @notice Helper contract to demonstrate short address attack
 * @dev This contract helps create and test short addresses
 */
contract ShortAddressAttacker {
    /**
     * @notice Creates a short address (19 bytes) by removing the last byte
     * @param fullAddress The full 20-byte address
     * @return shortAddress The 19-byte address (padded to 20 bytes by EVM)
     */
    function createShortAddress(address fullAddress) external pure returns (address) {
        // Remove the last byte by shifting right then left
        // This creates an address that ends with 0x00
        return address(uint160(uint256(uint160(fullAddress)) >> 8 << 8));
    }

    /**
     * @notice Checks if an address is a short address (ends with 0x00)
     * @param addr The address to check
     * @return isShort True if the address ends with 0x00
     */
    function isShortAddress(address addr) external pure returns (bool) {
        // Check if the last byte is 0
        return uint8(uint160(addr)) == 0 && (uint160(addr) & 0xFF) == 0;
    }
}

