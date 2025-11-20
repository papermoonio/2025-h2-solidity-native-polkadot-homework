// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract Basic_Logic_Counter{
    uint256 public x;

    event Increment(uint256 x);

    function increment() public{
        unchecked { // 不适用solidity的默认溢出检查，节省gas
            x += 1;
        }
        emit Increment(x);
    }

    function incrementBy(uint256 by) public {
        require(by > 0, "incrementBy: increment should be positive");
        unchecked {
            x += by;
        }
        emit Increment(x);
    }

}