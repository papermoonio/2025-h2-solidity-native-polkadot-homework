// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/RandomGame.sol";

contract RandomnessTest is Test {
    RandomGame public game;
    address owner = vm.addr(1);
    address playerA = vm.addr(2);
    address playerB = vm.addr(3);
    address playerC = vm.addr(4);

    function setUp() public {
        // deploy the predictable random game (owner is deployer)
        vm.prank(owner);
        game = new RandomGame();

        // fund each player with ETH
        vm.deal(playerA, 1 ether);
        vm.deal(playerB, 1 ether);
        vm.deal(playerC, 1 ether);
    }

    function test_predictable_winner_by_block_vars() public {
        // players enter (must send exact 0.1 ether as in contract)
        vm.prank(playerA);
        game.enter{value: 0.1 ether}();
        vm.prank(playerB);
        game.enter{value: 0.1 ether}();
        vm.prank(playerC);
        game.enter{value: 0.1 ether}();

        // set a deterministic block timestamp we control to show predictability
        vm.warp(1_700_000_000); // deterministic timestamp

        // read the values used by contract for random (same formula)
        uint256 ts = uint256(block.timestamp);
        uint256 diff = uint256(block.difficulty); // in foundry this will be a stable value during test
        uint256 len = 3;

        uint256 rand = uint256(keccak256(abi.encodePacked(ts, diff, len)));
        uint256 expectedIndex = rand % len;

        // capture balances before pick
        uint256 balA = playerA.balance;
        uint256 balB = playerB.balance;
        uint256 balC = playerC.balance;
        uint256 pot = address(game).balance;
        assertEq(pot, 0.3 ether);

        // owner calls pickWinner (contract transfers pot to winner)
        vm.prank(owner);
        game.pickWinner();

        // find which player got paid (one will have increased by pot)
        if (expectedIndex == 0) {
            assertEq(playerA.balance, balA + pot);
        } else if (expectedIndex == 1) {
            assertEq(playerB.balance, balB + pot);
        } else {
            assertEq(playerC.balance, balC + pot);
        }
    }
}