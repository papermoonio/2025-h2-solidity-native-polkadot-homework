// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MintableERC20} from "./MintableERC20.sol";

contract MintableERC20Test is Test {
  MintableERC20 token;
  address alice = address(0xA11CE);
  address bob = address(0xB0B);

  function setUp() public {
    token = new MintableERC20("Mintable", "MINT");
  }

  function test_Metadata() public view {
    require(keccak256(bytes(token.name())) == keccak256(bytes("Mintable")), "name mismatch");
    require(keccak256(bytes(token.symbol())) == keccak256(bytes("MINT")), "symbol mismatch");
    require(token.decimals() == 18, "decimals mismatch");
  }

  function test_CanMintInitially() public view {
    require(token.canMint(alice) == true, "new user should be able to mint");
  }

  function test_MintOnce() public {
    vm.prank(alice);
    token.mintToken();
    require(token.balanceOf(alice) == 1e18, "mint amount incorrect");
    require(token.canMint(alice) == false, "should not be able to mint again yet");
  }

  function test_Revert_MintTooFrequently() public {
    vm.startPrank(alice);
    token.mintToken();
    vm.expectRevert(bytes("Minting too frequently"));
    token.mintToken();
    vm.stopPrank();
  }

  function test_CanMintAfterInterval() public {
    vm.prank(alice);
    token.mintToken();

    // fast-forward 1 hour
    vm.warp(block.timestamp + 1 hours);
    require(token.canMint(alice) == true, "should be able to mint after interval");

    vm.prank(alice);
    token.mintToken();
    require(token.balanceOf(alice) == 2e18, "second mint amount incorrect");
  }

  function test_OwnerOnlySetInterval() public {
    // non-owner cannot set interval
    vm.prank(alice);
    vm.expectRevert(bytes("Only owner can set interval"));
    token.setInterval(30 minutes);

    // owner can set interval
    token.setInterval(10 seconds);

    // verify effect on mint window
    vm.prank(alice);
    token.mintToken();

    // immediate remint should fail
    vm.prank(alice);
    vm.expectRevert(bytes("Minting too frequently"));
    token.mintToken();

    // after 10 seconds, can mint again
    vm.warp(block.timestamp + 10 seconds);
    vm.prank(alice);
    token.mintToken();
    require(token.balanceOf(alice) == 2e18, "mint after interval failed");
  }
}

