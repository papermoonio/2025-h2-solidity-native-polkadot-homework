// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract Basic_Logic_Counter_V2{
    uint256 public x;

    // 新增变量
    uint256 public y;

    event Increment(uint256 x);

    // 新增事件
    event IncrementY(uint256 y);

    function increment() public{ // 在不改变函数结构下，调整内部逻辑
        unchecked { 
            x += 1;
            y += 2;
        }
        emit Increment(x);
        emit IncrementY(y);
    }

    function incrementBy(uint256 by) public {
        require(by > 0, "incrementBy: increment should be positive");
        unchecked {
            x += by;
        }
        emit Increment(x);
    }

    // 新增函数
    function incrementYBy(uint256 by) public {
        require(by > 0, "incrementYBy: increment should be positive");
        unchecked {
            y += by;
        }
        emit IncrementY(y);
    }

}