// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProxyContract {

    uint256 public count;


    // delegatecall 调用逻辑合约的 increment 函数
    function incrementViaDelegate(address logic) external {
        (bool success, ) = logic.delegatecall(
            abi.encodeWithSignature("increment()")
        );
        require(success, "delegatecall failed");
    }
}