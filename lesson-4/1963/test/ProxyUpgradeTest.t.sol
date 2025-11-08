// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/LogicV1.sol";
import "../src/LogicV2.sol";
import "../src/ERC1967Proxy.sol";

contract ProxyUpgradeTest is Test {
    LogicV1 public v1;
    LogicV2 public v2;
    ERC1967Proxy public proxy;

    address public deployer;
    address public alice;

    function setUp() public {
        // the test contract is the deployer (address(this))
        deployer = address(this);
        alice = address(0xBEEF);

        v1 = new LogicV1();
        proxy = new ERC1967Proxy(address(v1));

        // quick sanity
        assertEq(proxy.implementation(), address(v1));
        assertEq(proxy.admin(), deployer);
    }

    function _proxyCallIncrement() internal {
        (bool ok, ) = address(proxy).call(abi.encodeWithSignature("increment()"));
        require(ok, "proxy call failed");
    }

    function _proxyCounter() internal view returns (uint256) {
        return proxy.getCounter();
    }

    function test_initial_delegatecall_behavior() public {
        assertEq(v1.counter(), 0);
        assertEq(_proxyCounter(), 0);

        _proxyCallIncrement();

        assertEq(_proxyCounter(), 1);
        assertEq(v1.counter(), 0);
    }

    function test_upgrade_to_v2_and_persist_state() public {
        // make two increments (v1)
        _proxyCallIncrement();
        _proxyCallIncrement();
        assertEq(_proxyCounter(), 2);

        // deploy v2 separately
        v2 = new LogicV2();

        // non-admin (somebody else) cannot upgrade
        vm.prank(address(0xDEAD));
        vm.expectRevert(bytes("only-admin"));
        proxy.upgradeTo(address(v2));

        // admin upgrades
        vm.prank(deployer);
        proxy.upgradeTo(address(v2));

        assertEq(proxy.implementation(), address(v2));

        // new logic increments by +5
        _proxyCallIncrement();
        assertEq(_proxyCounter(), 7);
        assertEq(v2.counter(), 0);
    }

    function test_admin_change_and_protection() public {
        // initial admin is deployer
        assertEq(proxy.admin(), deployer);

        // deploy a v2 to use later (owner will try to upgrade)
        v2 = new LogicV2();

        // 1) Deployer (admin) changes admin to Alice
        vm.prank(deployer);
        proxy.changeAdmin(alice);

        // sanity: admin is alice now
        assertEq(proxy.admin(), alice);

        // 2) Deployer (old admin) tries to upgrade => MUST revert
        vm.prank(deployer);
        vm.expectRevert(bytes("only-admin"));
        proxy.upgradeTo(address(v2));

        // 3) Alice (new admin) upgrades successfully
        vm.prank(alice);
        proxy.upgradeTo(address(v2));

        // confirm implementation updated
        assertEq(proxy.implementation(), address(v2));
    }
}