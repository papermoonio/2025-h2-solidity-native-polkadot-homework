// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MyToken} from "../contracts/MyToken.sol";

contract MyTokenTestSuite {
	function test_deploy_and_metadata() public {
		MyToken token = new MyToken("MyToken", "MTK", 1000 ether, address(this));
		require(keccak256(bytes(token.name())) == keccak256(bytes("MyToken")), "name");
		require(keccak256(bytes(token.symbol())) == keccak256(bytes("MTK")), "symbol");
		require(token.decimals() == 18, "decimals");
		require(token.totalSupply() == 1000 ether, "supply");
		require(token.balanceOf(address(this)) == 1000 ether, "owner bal");
	}

	function test_transfer() public {
		MyToken token = new MyToken("MyToken", "MTK", 1000 ether, address(this));
		address to = address(0xBEEF);
		token.transfer(to, 10 ether);
		require(token.balanceOf(to) == 10 ether, "to bal");
		require(token.balanceOf(address(this)) == 990 ether, "owner bal after");
	}

	function test_approve_and_transferFrom() public {
		MyToken token = new MyToken("MyToken", "MTK", 1000 ether, address(this));
		address spender = address(this);
		address to = address(0xCAFE);
		token.approve(spender, 50 ether);
		require(token.allowance(address(this), spender) == 50 ether, "allowance");
		token.transferFrom(address(this), to, 20 ether);
		require(token.balanceOf(to) == 20 ether, "to bal after tf");
		require(token.balanceOf(address(this)) == 980 ether, "owner bal after tf");
		require(token.allowance(address(this), spender) == 30 ether, "allowance after");
	}
}


