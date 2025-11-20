// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ProxyContract {
    uint256 public counter;
    address public logicContract;

    constructor(address _logicContract) {
        logicContract = _logicContract;
    }

    function callIncrement() public {
        (bool success, ) = logicContract.delegatecall(abi.encodeWithSignature("increment()"));
        require(success, "Delegatecall failed");
    }
}
