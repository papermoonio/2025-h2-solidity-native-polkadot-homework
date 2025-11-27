// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;
contract VulnerableVault {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "No balance");
        // external call before state update -> vulnerable
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "Transfer failed");
        balances[msg.sender] = 0;
    }
}
