// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract RandomGame {
    address public owner;
    address[] public players;

    constructor() {
        owner = msg.sender;
    }

    function enter() external payable {
        require(msg.value == 0.1 ether);
        players.push(msg.sender);
    }

    function pickWinner() external {
        require(msg.sender == owner, "only owner");
        // predictable pseudo-random
        uint256 rand = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, players.length)));
        address winner = players[rand % players.length];
        payable(winner).transfer(address(this).balance);
        delete players;
    }
}