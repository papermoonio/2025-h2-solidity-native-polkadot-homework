// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.4.26;

import {VulnERC223Token, IERC223Receiver} from "../contracts/VulnERC223Token.sol";
import {VulnerableVault} from "../contracts/ReentrancyAttack.sol";
import {ReentrancyAttacker} from "../contracts/ReentrancyAttack.sol";

contract TestReentrancy {
    VulnERC223Token public token;
    ReentrancyAttacker public attacker;
    VulnerableVault public vulnerableVault;

    function setUp() public {
        token = new VulnERC223Token("Test Token", "TEST", 18, 1000000);
        vulnerableVault = new VulnerableVault(address(token));
        attacker = new ReentrancyAttacker(address(vulnerableVault), address(token));
        token.mint(address(attacker), 1000);
        token.approve(address(vulnerableVault), 5000);
        vulnerableVault.deposit(5000);
    }

    function testReentrancy() public {
        attacker.attack();
        // TODO: Implement testReentrancy
    }
}
