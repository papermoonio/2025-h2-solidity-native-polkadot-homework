// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HelloWorld {
    string public message = "Hello, Polkadot Solidity!";

    function setMessage(string memory newMessage) public {
        message = newMessage;
    }
}
