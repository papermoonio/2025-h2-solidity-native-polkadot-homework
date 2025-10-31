// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/ERC20.sol";

contract ERC20Test is Test {
    ERC20 public token;
    address public owner = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);

    uint256 constant TOTAL_SUPPLY = 1000000;
    uint256 constant INITIAL_SUPPLY = TOTAL_SUPPLY * 10 ** 18;
    string constant TOKEN_NAME = "Test Token";
    string constant TOKEN_SYMBOL = "TEST";

    function setUp() public {
        vm.prank(owner);
        token = new ERC20(TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY);
    }

    function test_Deployment() public view {
        assertEq(token.name(), TOKEN_NAME);
        assertEq(token.symbol(), TOKEN_SYMBOL);
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY);
    }

    function test_Transfer() public {
        uint256 transferAmount = 1000 * 10 ** 18;

        vm.prank(owner);
        bool success = token.transfer(user1, transferAmount);

        assertTrue(success);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY - transferAmount);
        assertEq(token.balanceOf(user1), transferAmount);
    }

    function test_Transfer_Event() public {
        uint256 transferAmount = 1000 * 10 ** 18;

        vm.expectEmit(true, true, false, true);
        emit ERC20.Transfer(owner, user1, transferAmount);

        vm.prank(owner);
        token.transfer(user1, transferAmount);
    }

    function test_Transfer_InsufficientBalance() public {
        uint256 excessiveAmount = INITIAL_SUPPLY + 1;

        vm.prank(owner);
        vm.expectRevert("ERC20: transfer amount exceeds balance");
        token.transfer(user1, excessiveAmount);
    }

    function test_Transfer_ZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("ERC20: transfer to the zero address");
        token.transfer(address(0), 1000);
    }

    function test_Approve() public {
        uint256 approveAmount = 500 * 10 ** 18;

        vm.prank(owner);
        bool success = token.approve(user1, approveAmount);

        assertTrue(success);
        assertEq(token.allowance(owner, user1), approveAmount);
    }

    function test_Approve_Event() public {
        uint256 approveAmount = 500 * 10 ** 18;

        vm.expectEmit(true, true, false, true);
        emit ERC20.Approval(owner, user1, approveAmount);

        vm.prank(owner);
        token.approve(user1, approveAmount);
    }

    function test_TransferFrom() public {
        uint256 approveAmount = 1000 * 10 ** 18;
        uint256 transferAmount = 500 * 10 ** 18;

        // Owner approves user1 to spend tokens
        vm.prank(owner);
        token.approve(user1, approveAmount);

        // User1 transfers from owner to user2
        vm.prank(user1);
        bool success = token.transferFrom(owner, user2, transferAmount);

        assertTrue(success);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY - transferAmount);
        assertEq(token.balanceOf(user2), transferAmount);
        assertEq(token.allowance(owner, user1), approveAmount - transferAmount);
    }

    function test_TransferFrom_InsufficientAllowance() public {
        uint256 approveAmount = 100 * 10 ** 18;
        uint256 transferAmount = 200 * 10 ** 18;

        vm.prank(owner);
        token.approve(user1, approveAmount);

        vm.prank(user1);
        vm.expectRevert("ERC20: insufficient allowance");
        token.transferFrom(owner, user2, transferAmount);
    }

    function test_TransferFrom_InfiniteAllowance() public {
        uint256 maxUint = type(uint256).max;
        uint256 transferAmount = 1000 * 10 ** 18;

        // Set infinite allowance
        vm.prank(owner);
        token.approve(user1, maxUint);

        // First transfer
        vm.prank(user1);
        token.transferFrom(owner, user2, transferAmount);

        // Second transfer - should still work
        vm.prank(user1);
        token.transferFrom(owner, user2, transferAmount);

        // Allowance should remain max
        assertEq(token.allowance(owner, user1), maxUint);
        assertEq(token.balanceOf(user2), transferAmount * 2);
    }

    function test_Mint() public {
        uint256 mintAmount = 5000 * 10 ** 18;
        uint256 initialSupply = token.totalSupply();

        vm.prank(owner);
        token.mint(user1, mintAmount);

        assertEq(token.totalSupply(), initialSupply + mintAmount);
        assertEq(token.balanceOf(user1), mintAmount);
    }

    function test_Mint_Event() public {
        uint256 mintAmount = 5000 * 10 ** 18;

        vm.expectEmit(true, true, false, true);
        emit ERC20.Transfer(address(0), user1, mintAmount);

        vm.prank(owner);
        token.mint(user1, mintAmount);
    }

    function test_Mint_ZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("ERC20: mint to the zero address");
        token.mint(address(0), 1000);
    }

    function test_Burn() public {
        uint256 burnAmount = 1000 * 10 ** 18;
        uint256 initialSupply = token.totalSupply();
        uint256 initialBalance = token.balanceOf(owner);

        vm.prank(owner);
        token.burn(owner, burnAmount);

        assertEq(token.totalSupply(), initialSupply - burnAmount);
        assertEq(token.balanceOf(owner), initialBalance - burnAmount);
    }

    function test_Burn_Event() public {
        uint256 burnAmount = 1000 * 10 ** 18;

        vm.expectEmit(true, true, false, true);
        emit ERC20.Transfer(owner, address(0), burnAmount);

        vm.prank(owner);
        token.burn(owner, burnAmount);
    }

    function test_Burn_InsufficientBalance() public {
        uint256 burnAmount = INITIAL_SUPPLY + 1;

        vm.prank(owner);
        vm.expectRevert("ERC20: burn amount exceeds balance");
        token.burn(owner, burnAmount);
    }

    function test_Burn_ZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("ERC20: burn from the zero address");
        token.burn(address(0), 1000);
    }

    function test_ZeroValueTransfer() public {
        vm.prank(owner);
        bool success = token.transfer(user1, 0);

        assertTrue(success);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY);
        assertEq(token.balanceOf(user1), 0);
    }

    function test_ZeroValueApprove() public {
        vm.prank(owner);
        bool success = token.approve(user1, 0);

        assertTrue(success);
        assertEq(token.allowance(owner, user1), 0);
    }

    function test_Transfer_From_ZeroValue() public {
        vm.prank(owner);
        token.approve(user1, 1000);

        vm.prank(user1);
        bool success = token.transferFrom(owner, user2, 0);

        assertTrue(success);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY);
        assertEq(token.balanceOf(user2), 0);
        assertEq(token.allowance(owner, user1), 1000);
    }
}
