// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LogicContract {
    uint256 public counter;

    function increment() public {
        counter += 1;
    }
}
