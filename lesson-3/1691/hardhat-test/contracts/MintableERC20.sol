// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MintableERC20 is ERC20{
    mapping(address => uint) public lastMintTimestamp;
    uint public interval;
    address public owner;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        interval = 1 hours;
        owner = msg.sender;
    }

    function mintToken() public {
        require(canMint(msg.sender), "Minting too frequently");
        _mint(msg.sender, 1000000000000000000);
        lastMintTimestamp[msg.sender] = block.timestamp;
    }

    function canMint(address user) public view returns (bool) {
        return block.timestamp >= lastMintTimestamp[user] + interval || lastMintTimestamp[user] == 0;
    }

    function setInterval(uint newInterval) public {
        require(msg.sender == owner, "Only owner can set interval");
        interval = newInterval;
    }
}