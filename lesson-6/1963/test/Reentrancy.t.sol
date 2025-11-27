// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/ReentrancyVault.sol";
import "../contracts/ReentrancyAttacker.sol";

contract ReentrancyTest is Test {
    ReentrancyVault public vault;
    ReentrancyAttacker public attacker;

    address depositor = vm.addr(1);
    address attackerEOA = vm.addr(2);

    function setUp() public {
        // deploy vault
        vault = new ReentrancyVault();

        // give depositor and attacker initial balances
        vm.deal(depositor, 5 ether);
        vm.deal(attackerEOA, 2 ether);

        // depositor funds the vault with 5 ether
        vm.prank(depositor);
        vault.deposit{value: 5 ether}();

        // deploy attacker contract (attackerEOA as deployer)
        vm.prank(attackerEOA);
        attacker = new ReentrancyAttacker(payable(address(vault)));
    }

    function test_attacker_drains_vault_via_reentrancy() public {
        // sanity: vault has 5 ether
        assertEq(address(vault).balance, 5 ether);

        // attacker deposits 1 ether into the vault from their EOA balance (via attacker contract)
        vm.prank(attackerEOA);
        attacker.attack{value: 1 ether}();

        // after attack we expect the vault to be drained (vulnerable withdraw drains more)
        assertEq(address(vault).balance, 0, "Vault should be drained to 0");

        // attacker contract should hold at least initial vault + attacker deposit (or at least > 1 ether)
        assert(address(attacker).balance >= 6 ether - 1 wei); // tolerance for gas / rounding
    }
}