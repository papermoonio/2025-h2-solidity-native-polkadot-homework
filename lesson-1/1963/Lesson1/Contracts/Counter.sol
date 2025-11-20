// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Counter {
    uint256 public count;

    // increment the counter
    function increment() public {
        count += 1;
    }

    // decrement the counter
    function decrement() public {
        require(count > 0, "Counter is already zero");
        count -= 1;
    }

    // manually set count
    function set(uint256 newCount) public {
        count = newCount;
    }
}
