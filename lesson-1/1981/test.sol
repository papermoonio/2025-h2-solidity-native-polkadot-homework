// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TestContract {
    string testVar = "test var";

    function setVar(string memory _var) public {
        testVar = _var;
    }

    function getVar() public view returns (string memory){
        return testVar;
    }
}