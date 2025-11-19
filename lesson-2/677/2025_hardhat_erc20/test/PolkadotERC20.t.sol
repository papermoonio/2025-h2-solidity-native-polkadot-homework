// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {PolkadotERC20} from "../contracts/PolkadotERC20.sol";

contract PolkadotERC20Test is Test {
    PolkadotERC20 private token;
    
    // 測試地址
    address private owner = address(0x1);
    address private user1 = address(0x2);
    address private user2 = address(0x3);
    address private spender = address(0x4);
    
    // 初始參數
    string private constant TOKEN_NAME = "Polkadot Test Token";
    string private constant TOKEN_SYMBOL = "PDOT";
    uint8 private constant DECIMALS = 18;
    uint256 private constant INITIAL_SUPPLY = 1000000;
    
    function setUp() public {
        // 設置msg.sender為owner
        vm.startPrank(owner);
        
        // 部署代幣合約
        token = new PolkadotERC20(
            TOKEN_NAME,
            TOKEN_SYMBOL,
            DECIMALS,
            INITIAL_SUPPLY
        );
        
        vm.stopPrank();
    }
    
    // 測試基本資訊
    function testBasicInfo() public view {
        assertEq(token.name(), TOKEN_NAME);
        assertEq(token.symbol(), TOKEN_SYMBOL);
        assertEq(token.decimals(), DECIMALS);
        assertEq(token.owner(), owner);
    }
    
    // 測試初始供應量
    function testInitialSupply() public view {
        uint256 expectedSupply = INITIAL_SUPPLY * 10**DECIMALS;
        assertEq(token.totalSupply(), expectedSupply);
        assertEq(token.balanceOf(owner), expectedSupply);
    }
    
    // 測試轉賬功能
    function testTransfer() public {
        vm.startPrank(owner);
        
        uint256 transferAmount = 1000 * 10**DECIMALS;
        uint256 ownerInitialBalance = token.balanceOf(owner);
        uint256 user1InitialBalance = token.balanceOf(user1);
        
        // 執行轉賬
        bool success = token.transfer(user1, transferAmount);
        assertTrue(success);
        
        // 檢查餘額變化
        assertEq(token.balanceOf(owner), ownerInitialBalance - transferAmount);
        assertEq(token.balanceOf(user1), user1InitialBalance + transferAmount);
        
        vm.stopPrank();
    }
    
    // 測試轉賬金額超過餘額
    function testTransferInsufficientBalance() public {
        vm.startPrank(user1); // user1初始餘額為0
        
        uint256 transferAmount = 1000 * 10**DECIMALS;
        
        // 應該失敗
        vm.expectRevert("ERC20: transfer amount exceeds balance");
        token.transfer(user2, transferAmount);
        
        vm.stopPrank();
    }
    
    // 測試轉賬到零地址
    function testTransferToZeroAddress() public {
        vm.startPrank(owner);
        
        uint256 transferAmount = 1000 * 10**DECIMALS;
        
        vm.expectRevert("ERC20: transfer to the zero address");
        token.transfer(address(0), transferAmount);
        
        vm.stopPrank();
    }
    
    // 測試授權功能
    function testApprove() public {
        vm.startPrank(owner);
        
        uint256 allowanceAmount = 5000 * 10**DECIMALS;
        
        // 執行授權
        bool success = token.approve(spender, allowanceAmount);
        assertTrue(success);
        
        // 檢查授權額度
        assertEq(token.allowance(owner, spender), allowanceAmount);
        
        vm.stopPrank();
    }
    
    // 測試transferFrom功能
    function testTransferFrom() public {
        // 先設置授權
        vm.startPrank(owner);
        uint256 allowanceAmount = 5000 * 10**DECIMALS;
        token.approve(spender, allowanceAmount);
        vm.stopPrank();
        
        // 使用spender執行transferFrom
        vm.startPrank(spender);
        
        uint256 transferAmount = 3000 * 10**DECIMALS;
        uint256 ownerInitialBalance = token.balanceOf(owner);
        uint256 user2InitialBalance = token.balanceOf(user2);
        
        // 執行transferFrom
        bool success = token.transferFrom(owner, user2, transferAmount);
        assertTrue(success);
        
        // 檢查餘額變化
        assertEq(token.balanceOf(owner), ownerInitialBalance - transferAmount);
        assertEq(token.balanceOf(user2), user2InitialBalance + transferAmount);
        
        // 檢查授權額度減少
        assertEq(token.allowance(owner, spender), allowanceAmount - transferAmount);
        
        vm.stopPrank();
    }
    
    // 測試超過授權額度的transferFrom
    function testTransferFromExceedsAllowance() public {
        // 先設置授權
        vm.startPrank(owner);
        uint256 allowanceAmount = 1000 * 10**DECIMALS;
        token.approve(spender, allowanceAmount);
        vm.stopPrank();
        
        // 嘗試轉賬超過授權額度
        vm.startPrank(spender);
        
        uint256 transferAmount = 2000 * 10**DECIMALS;
        
        vm.expectRevert("ERC20: insufficient allowance");
        token.transferFrom(owner, user2, transferAmount);
        
        vm.stopPrank();
    }
    
    // 測試鑄幣功能
    function testMint() public {
        vm.startPrank(owner);
        
        uint256 mintAmount = 50000 * 10**DECIMALS;
        uint256 initialTotalSupply = token.totalSupply();
        uint256 user1InitialBalance = token.balanceOf(user1);
        
        // 執行鑄幣
        token.mint(user1, mintAmount);
        
        // 檢查總供應量和餘額變化
        assertEq(token.totalSupply(), initialTotalSupply + mintAmount);
        assertEq(token.balanceOf(user1), user1InitialBalance + mintAmount);
        
        vm.stopPrank();
    }
    
    // 測試非管理員鑄幣
    function testMintNotOwner() public {
        vm.startPrank(user1); // user1不是owner
        
        uint256 mintAmount = 50000 * 10**DECIMALS;
        
        vm.expectRevert("ERC20: only owner can mint");
        token.mint(user1, mintAmount);
        
        vm.stopPrank();
    }
    
    // 測試鑄幣到零地址
    function testMintToZeroAddress() public {
        vm.startPrank(owner);
        
        uint256 mintAmount = 50000 * 10**DECIMALS;
        
        vm.expectRevert("ERC20: mint to the zero address");
        token.mint(address(0), mintAmount);
        
        vm.stopPrank();
    }
    
    // 測試銷毀功能
    function testBurn() public {
        // 先給user1一些代幣
        vm.startPrank(owner);
        uint256 transferAmount = 10000 * 10**DECIMALS;
        token.transfer(user1, transferAmount);
        vm.stopPrank();
        
        // user1銷毀部分代幣
        vm.startPrank(user1);
        
        uint256 burnAmount = 5000 * 10**DECIMALS;
        uint256 initialTotalSupply = token.totalSupply();
        uint256 user1InitialBalance = token.balanceOf(user1);
        
        // 執行銷毀
        token.burn(burnAmount);
        
        // 檢查總供應量和餘額變化
        assertEq(token.totalSupply(), initialTotalSupply - burnAmount);
        assertEq(token.balanceOf(user1), user1InitialBalance - burnAmount);
        
        vm.stopPrank();
    }
    
    // 測試銷毀超過餘額
    function testBurnInsufficientBalance() public {
        vm.startPrank(user1); // user1餘額不足
        
        uint256 burnAmount = 1000 * 10**DECIMALS;
        
        vm.expectRevert("ERC20: burn amount exceeds balance");
        token.burn(burnAmount);
        
        vm.stopPrank();
    }
    
    // 測試所有權轉移
    function testTransferOwnership() public {
        vm.startPrank(owner);
        
        // 轉移所有權
        token.transferOwnership(user1);
        
        // 檢查新所有者
        assertEq(token.owner(), user1);
        
        vm.stopPrank();
    }
    
    // 測試非管理員轉移所有權
    function testTransferOwnershipNotOwner() public {
        vm.startPrank(user1); // user1不是owner
        
        vm.expectRevert("ERC20: only owner can transfer ownership");
        token.transferOwnership(user2);
        
        vm.stopPrank();
    }
    
    // 測試轉移所有權到零地址
    function testTransferOwnershipToZeroAddress() public {
        vm.startPrank(owner);
        
        vm.expectRevert("ERC20: new owner is the zero address");
        token.transferOwnership(address(0));
        
        vm.stopPrank();
    }
    
    // 測試事件發射
    function testTransferEvent() public {
        vm.startPrank(owner);
        
        uint256 transferAmount = 1000 * 10**DECIMALS;
        
        // 檢查Transfer事件
        vm.expectEmit(true, true, false, true);
        emit PolkadotERC20.Transfer(owner, user1, transferAmount);
        
        token.transfer(user1, transferAmount);
        
        vm.stopPrank();
    }
    
    function testApprovalEvent() public {
        vm.startPrank(owner);
        
        uint256 allowanceAmount = 5000 * 10**DECIMALS;
        
        // 檢查Approval事件
        vm.expectEmit(true, true, false, true);
        emit PolkadotERC20.Approval(owner, spender, allowanceAmount);
        
        token.approve(spender, allowanceAmount);
        
        vm.stopPrank();
    }
    
    // 測試邊界情況
    function testTransferMaxValue() public {
        vm.startPrank(owner);
        
        uint256 ownerBalance = token.balanceOf(owner);
        
        // 轉賬全部餘額
        token.transfer(user1, ownerBalance);
        
        assertEq(token.balanceOf(owner), 0);
        assertEq(token.balanceOf(user1), ownerBalance);
        
        vm.stopPrank();
    }
    
    // 測試授權最大值
    function testApproveMaxValue() public {
        vm.startPrank(owner);
        
        // 設置最大授權
        token.approve(spender, type(uint256).max);
        assertEq(token.allowance(owner, spender), type(uint256).max);
        
        // 使用transferFrom不會減少授權額度
        vm.stopPrank();
        vm.startPrank(spender);
        token.transferFrom(owner, user1, 1000 * 10**DECIMALS);
        assertEq(token.allowance(owner, spender), type(uint256).max);
        
        vm.stopPrank();
    }
}