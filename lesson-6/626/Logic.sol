// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Logic {
    address public lib;     // Slot 0
    uint256 public number;  // Slot 1
    address public owner;   // Slot 2

    function setNumber(uint256 _num) public {
        number = _num;
    }
}
