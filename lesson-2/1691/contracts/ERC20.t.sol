// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "./ERC20.sol";

contract ERC20Test is Test {
  ERC20 token;
  address alice = address(0xA11CE);
  address bob = address(0xB0B);

  uint8 constant DECIMALS = 18;
  uint256 constant INITIAL_WHOLE_SUPPLY = 1000; // whole tokens
  uint256 constant ONE = 1e18;

  function setUp() public {
    token = new ERC20("TestToken", "TT", DECIMALS, INITIAL_WHOLE_SUPPLY);
  }

  function test_Metadata() public view {
    require(keccak256(bytes(token.name())) == keccak256(bytes("TestToken")), "name mismatch");
    require(keccak256(bytes(token.symbol())) == keccak256(bytes("TT")), "symbol mismatch");
    require(token.decimals() == DECIMALS, "decimals mismatch");
  }

  function test_InitialSupplyAssignedToDeployer() public view {
    uint256 expected = INITIAL_WHOLE_SUPPLY * (10 ** uint256(DECIMALS));
    require(token.totalSupply() == expected, "totalSupply incorrect");
    require(token.balanceOf(address(this)) == expected, "deployer balance incorrect");
  }

  function test_Transfer() public {
    uint256 amount = 100 * ONE;
    token.transfer(alice, amount);
    require(token.balanceOf(alice) == amount, "alice should receive amount");
  }

  function test_Revert_TransferInsufficientBalance() public {
    vm.prank(alice);
    vm.expectRevert(bytes("ERC20: insufficient balance"));
    token.transfer(address(0x1234), 1);
  }

  function test_Revert_TransferToZero() public {
    vm.expectRevert(bytes("ERC20: transfer to zero"));
    token.transfer(address(0), 1);
  }

  function test_ApproveAndTransferFrom() public {
    uint256 amount = 50 * ONE;
    // Approve bob to spend on behalf of this contract
    bool ok = token.approve(bob, amount);
    require(ok, "approve failed");
    require(token.allowance(address(this), bob) == amount, "allowance not set");

    // bob spends using transferFrom
    vm.prank(bob);
    bool ok2 = token.transferFrom(address(this), alice, amount);
    require(ok2, "transferFrom failed");

    // allowance should be decreased to zero and alice received tokens
    require(token.allowance(address(this), bob) == 0, "allowance not decreased");
    require(token.balanceOf(alice) == amount, "alice balance incorrect");
  }

  function test_Revert_TransferFromInsufficientAllowance() public {
    token.approve(bob, 10);
    vm.prank(bob);
    vm.expectRevert(bytes("ERC20: insufficient allowance"));
    token.transferFrom(address(this), alice, 11);
  }

  function test_IncreaseDecreaseAllowance() public {
    // start at 0
    require(token.allowance(address(this), bob) == 0, "initial allowance non-zero");

    // increase
    bool ok1 = token.increaseAllowance(bob, 30);
    require(ok1, "increaseAllowance failed");
    require(token.allowance(address(this), bob) == 30, "allowance after increase incorrect");

    // decrease partially
    bool ok2 = token.decreaseAllowance(bob, 10);
    require(ok2, "decreaseAllowance failed");
    require(token.allowance(address(this), bob) == 20, "allowance after decrease incorrect");
  }

  function test_Revert_DecreaseAllowanceBelowZero() public {
    // set some allowance
    token.approve(bob, 5);
    vm.expectRevert(bytes("ERC20: decreased below zero"));
    token.decreaseAllowance(bob, 6);
  }
}

