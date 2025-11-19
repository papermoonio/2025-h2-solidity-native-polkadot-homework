// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice LogicV2: upgraded logic — increment behavior changed (adds +5)
contract LogicV2 {
    // Must keep the same storage layout for variables that L1 used (counter at slot 0).
    uint256 public counter;

    // New behavior: increment by +5 (so we can observe the change after upgrade)
    function increment() public {
        counter += 5;
    }

    // New function available after upgrade (demonstrates new logic)
    function increaseBy(uint256 amt) public {
        counter += amt;
    }
}