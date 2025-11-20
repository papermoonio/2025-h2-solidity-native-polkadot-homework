// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Proxy {
    uint256 public counter;   // slot 0
    address public owner;     // slot 1
    address public implementation; // slot 2

    event Upgraded(address indexed implementation);

    constructor(address _implementation) {
        implementation = _implementation;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    function setImplementation(address _impl) external onlyOwner {
        implementation = _impl;
        emit Upgraded(_impl);
    }

    // 修正后的 wrapper
    function increment() external {
        (bool success, ) = implementation.delegatecall(
            abi.encodeWithSignature("increment()")
        );
        require(success, "delegatecall failed");
    }

    fallback() external payable {
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(0, 0, size)
            switch result
            case 0 { revert(0, size) }
            default { return(0, size) }
        }
    }

    receive() external payable {}
}
