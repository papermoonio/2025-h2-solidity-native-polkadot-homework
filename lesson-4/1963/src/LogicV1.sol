// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice LogicV1: simple logic contract that increments counter by +1
contract LogicV1 {
    // IMPORTANT: logic contract declares `counter` as the first state variable (slot 0)
    // so when delegatecall runs, it reads/writes proxy's slot 0.
    uint256 public counter;

    function increment() public {
        // increments "counter" in the *current* storage context (delegatecall => caller storage)
        counter += 1;
    }
}