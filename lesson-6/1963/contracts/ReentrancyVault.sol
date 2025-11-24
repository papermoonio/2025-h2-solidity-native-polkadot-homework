// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ReentrancyVault {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    // vulnerable withdraw: sends before updating balance
    function withdraw() external {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "no funds");
        // interaction first (VULNERABLE)
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "send failed");
        // effects later (should be before)
        balances[msg.sender] = 0;
    }

    // helper to fund contract
    receive() external payable {}
}