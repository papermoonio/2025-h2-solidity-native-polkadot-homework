// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Deploy & Attack script for Reentrancy demo (Foundry Script)
/// @notice Deploys ReentrancyVault, funds it, deploys ReentrancyAttacker, and runs the attack.
/// Usage (local anvil):
/// 1) start anvil in one terminal: `anvil`
/// 2) run this script in another terminal (example below)
///
/// Notes:
/// - This script uses the broadcasting account (the private key you pass to `forge script --private-key`).
/// - When running against anvil, use one of anvil's printed private keys (the first account is fine).
import "forge-std/Script.sol";
import "forge-std/console.sol";

import "../contracts/ReentrancyVault.sol";
import "../contracts/ReentrancyAttacker.sol";

contract DeployAndAttack is Script {
    function run() external {
        /**************************************************************************
         * 1) Prepare broadcaster: start broadcast using the private key provided
         *    to `forge script` via --private-key or via foundry's default key.
         **************************************************************************/
        // Start broadcast — transactions below are sent by the account corresponding to the provided private key.
        vm.startBroadcast();

        console.log("\n=== Deploying ReentrancyVault (vulnerable) ===");
        ReentrancyVault vault = new ReentrancyVault();
        console.log("Vault deployed at:", address(vault));

        // Fund the vault by calling deposit() from the broadcaster account.
        // This uses the broadcaster account's balance. Make sure the broadcaster has >= 6 ETH (anvil default accounts do).
        uint256 initialVaultFund = 5 ether;
        console.log("Funding vault with %s ether ...", initialVaultFund / 1 ether);
        vault.deposit{value: initialVaultFund}();
        console.log("Vault balance (after fund):", address(vault).balance / 1 ether, "ETH");

        console.log("\n=== Deploying ReentrancyAttacker ===");
        // Deploy attacker contract, deployer is broadcaster (attackerEOA in this demo).
        ReentrancyAttacker attacker = new ReentrancyAttacker(payable(address(vault)));
        console.log("Attacker contract deployed at:", address(attacker));

        // Display balances before attack
        console.log("\n--- Balances BEFORE attack ---");
        console.log("Vault balance:", address(vault).balance / 1 ether, "ETH");
        console.log("Attacker contract balance:", address(attacker).balance / 1 ether, "ETH");
        console.log("Attacker EOA (broadcaster) balance:", address(msg.sender).balance / 1 ether, "ETH");

        /**************************************************************************
         * 2) Run the attack
         *    Attacker contract's attack() deposits 1 ETH from broadcaster and triggers withdraw(),
         *    which uses the vulnerable withdraw() and causes reentrancy drain.
         **************************************************************************/
        console.log("\n=== Executing attack() on attacker contract (sends 1 ETH) ===");
        // Make the attacker contract call attack(), providing 1 ether as attack deposit.
        attacker.attack{value: 1 ether}();
        console.log("attack() call finished.");

        // Display balances after attack
        console.log("\n--- Balances AFTER attack ---");
        console.log("Vault balance:", address(vault).balance / 1 ether, "ETH");
        console.log("Attacker contract balance:", address(attacker).balance / 1 ether, "ETH");
        console.log("Attacker EOA (broadcaster) balance:", address(msg.sender).balance / 1 ether, "ETH");

        vm.stopBroadcast();
    }
}
