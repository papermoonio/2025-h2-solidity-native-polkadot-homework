// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {LogicContract} from "../contracts/Logic.sol";
import {ProxyContract} from "../contracts/Proxy.sol";

contract DelegateCallTest is Test {
    LogicContract logic;
    ProxyContract proxy;

    function setUp() public {
        logic = new LogicContract();
        proxy = new ProxyContract();
    }

    function test_DelegateCallUpdatesProxyStorage() public {
        // initial values
        assertEq(proxy.counter(), 0);
        assertEq(logic.counter(), 0);

        // call via proxy
        proxy.incrementViaDelegate(address(logic));

        // proxy counter increased
        assertEq(proxy.counter(), 1);
        // logic contract's own storage unchanged
        assertEq(logic.counter(), 0);

        // second call
        proxy.incrementViaDelegate(address(logic));
        assertEq(proxy.counter(), 2);
        assertEq(logic.counter(), 0);
    }
}
