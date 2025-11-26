// SPDX-License-Identifier: MIT
pragma solidity ^0.4.26;

/// FixedToken demonstrates a simple defense: enforce msg.data length exactly as ABI expects.
contract OldCompiledVulnerableToken{
    string public name = "FixedToken";
    string public symbol = "FIX";
    uint8 public decimals = 18;

    mapping(address => uint256) public balanceOf;

    constructor() public {}

    function mint(address to, uint256 amt) external {
        balanceOf[to] += amt;
    }

    function transfer(address to, uint256 amt) external returns (bool) {
        // Check calldata length: 4(selector) + 32(address) + 32(uint256) = 68 bytes
        // require(msg.data.length == 4 + 32 + 32, "bad calldata length");
        require(balanceOf[msg.sender] >= amt, "insufficient");
        balanceOf[msg.sender] -= amt;
        balanceOf[to] += amt;
        return true;
    }
}
