// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Proxy {
    uint256 public number;
    address public logicContract;

    constructor(address _logicContract) {
        logicContract = _logicContract;
    }

    function increment() public {
        (bool success, ) = logicContract.delegatecall(
            abi.encodeWithSignature("increment()")
        );
        require(success, "Delegatecall failed");
    }

    function getNumber() public view returns (uint256) {
        return number;
    }
} 