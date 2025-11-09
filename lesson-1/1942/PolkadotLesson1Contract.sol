// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract Lesson1Contract{
    uint public counter;

    uint public private_value = 1;

    constructor() {
        counter = 0;
    }

    function countAdd() public {
        counter = counter +1;

        private_value = counter + private_value;
    }

    function getCounter() public view returns (uint){
        return counter;
    }

}
