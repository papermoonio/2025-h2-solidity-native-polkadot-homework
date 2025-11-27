// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// Minimal vulnerable ERC20-like token to demonstrate short-address mis-decode.
/// NOTE: This intentionally uses calldataload without checking msg.data.length
/// to reproduce "short address" behavior for educational/test only.
contract NewCompiledVulnerableToken {
    string public name = "VulnToken";
    string public symbol = "VULN";
    uint8 public decimals = 18;

    mapping(address => uint256) public balanceOf;

    constructor() {
        // nothing
    }

    function mint(address to, uint256 amt) external {
        balanceOf[to] += amt;
    }

    /// Vulnerable transfer: read calldata with assembly and do NOT check msg.data.length.
    /// It expects ABI: selector (4) | address (32) | uint256 (32)
    /// But if calldata.address is shorter, amount will be read misaligned.
    function transfer(address /*toParam*/, uint256 /*amtParam*/) external returns (bool) {
        // We ignore solidity-decoded params and instead read calldata manually (vulnerable on purpose)
        bytes32 toWord;
        bytes32 amtWord;

        assembly {
            // calldataload(offset) loads 32 bytes starting from byte offset.
            // function selector is 4 bytes, so first arg at offset 4.
            toWord := calldataload(4)      // bytes 4..35
            amtWord := calldataload(36)    // bytes 36..67
        }

        address toAddr = address(uint160(uint256(toWord)));
        uint256 amt = uint256(amtWord);

        // basic checks
        require(balanceOf[msg.sender] >= amt, "insufficient");
        balanceOf[msg.sender] -= amt;
        balanceOf[toAddr] += amt;

        return true;
    }
}
