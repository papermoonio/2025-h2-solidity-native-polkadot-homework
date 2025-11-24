// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/BadProxy.sol";
import "../contracts/MaliciousImpl.sol";

contract DelegatecallTest is Test {
    BadProxy public proxy;
    MaliciousImpl public malicious;

    address deployer = vm.addr(1);
    address attacker = vm.addr(2);

    function setUp() public {
        // deploy a "benign" implementation address placeholder (we can use malicious initially or deploy a no-op)
        // For simplicity we deploy MaliciousImpl and then set it later to show upgrade flow.
        malicious = new MaliciousImpl();

        // deploy proxy with implementation = address(0) or a placeholder; owner becomes deployer
        vm.prank(deployer);
        proxy = new BadProxy(address(malicious)); // proxy.owner == deployer

        // sanity check owner
        assertEq(proxy.owner(), deployer);
    }

    function test_takeover_via_delegatecall() public {
        // Confirm owner initially is deployer
        assertEq(proxy.owner(), deployer);

        // Now simulate attacker invoking the malicious function via proxy's fallback.
        // The fallback does delegatecall(implementation, data)
        // The malicious implementation's takeover() will sstore(0, caller())
        // We impersonate attacker as caller to proxy.takeover()
        bytes memory payload = abi.encodeWithSignature("takeover()");

        // attacker calls proxy fallback -> delegatecall executes MaliciousImpl.takeover in proxy storage
        vm.prank(attacker);
        (bool ok, ) = address(proxy).call(payload);
        require(ok, "delegatecall via proxy failed in test");

        // After the delegatecall, proxy.owner should have been set to attacker
        assertEq(proxy.owner(), attacker, "Proxy owner should be overwritten by malicious delegatecall");
    }
}