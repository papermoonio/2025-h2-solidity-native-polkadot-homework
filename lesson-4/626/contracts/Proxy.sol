// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Proxy {
    uint256 public count;
    address public logic;

    constructor(address _logic) {
        logic = _logic;
    }

    function setLogic(address _logic) external {
        logic = _logic;
    }

    function increment() external returns (bytes memory) {
        (bool ok, bytes memory data) = logic.delegatecall(abi.encodeWithSignature("increment()"));
        require(ok, "delegatecall failed");
        return data;
    }
}