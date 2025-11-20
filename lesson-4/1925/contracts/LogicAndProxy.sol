// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Logic contract - increments a counter
contract LogicCounter {
    // IMPORTANT: `count` is the first state variable so it lives in storage slot 0.
    uint256 public count;

    // simple increment function; when called via delegatecall it will modify the caller's storage.
    function increment() public {
        count += 1;
    }

    // helper to set count (for testing / demonstration)
    function setCount(uint256 _v) public {
        count = _v;
    }
}

/// @title Proxy contract - delegates calls to LogicCounter
contract ProxyCounter {
    // Must mirror storage layout for variables used by the logic contract.
    // `count` must be at the same slot as in LogicCounter (slot 0).
    uint256 public count;

    // implementation address stored in slot 1
    address public implementation;

    event ImplementationUpdated(address indexed oldImpl, address indexed newImpl);
    event DelegateCallResult(bool success, bytes returnedData);

    constructor(address _implementation) {
        implementation = _implementation;
    }

    // admin helper to update implementation (no access control for simplicity — add one in production)
    function setImplementation(address _newImpl) public {
        address old = implementation;
        implementation = _newImpl;
        emit ImplementationUpdated(old, _newImpl);
    }

    // A direct function that uses delegatecall to call increment() on the implementation
    function incrementViaDelegate() public returns (bool) {
        require(implementation != address(0), "implementation not set");
        // call increment() on implementation via delegatecall
        (bool success, bytes memory data) = implementation.delegatecall(
            abi.encodeWithSignature("increment()")
        );
        emit DelegateCallResult(success, data);
        require(success, "delegatecall failed");
        return success;
    }

    // Optional: fallback to forward arbitrary calls to implementation via delegatecall
    fallback() external payable {
        require(implementation != address(0), "implementation not set");
        assembly {
            // copy calldata
            calldatacopy(0x0, 0x0, calldatasize())
            // delegatecall(gas, impl, calldata_ptr, calldata_size, 0, 0)
            let result := delegatecall(gas(), sload(1), 0x0, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(0x0, 0x0, size)
            switch result
            case 0 { revert(0x0, size) }
            default { return(0x0, size) }
        }
    }

    receive() external payable {
        // allow receiving ETH
    }
}