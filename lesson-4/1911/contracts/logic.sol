// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

contract logic {
    uint256 public value;
    address public owner;

    // 初始化函数
    function initialize(address _owner) public {
        require(owner == address(0), "Already initialized");
        owner = _owner;
        value = 0;
    }

    function count() public {
        require(msg.sender == owner, "Not owner");
        value += 1;
    }

    function setValue(uint256 _value) public {
        require(msg.sender == owner, "Not owner");
        value = _value;
    }

    function getValue() public view returns (uint256) {
        return value;
    }

    function getOwner() public view returns (address) {
        return owner;
    }
}
