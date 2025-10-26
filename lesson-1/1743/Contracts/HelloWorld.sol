// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract HelloWorld {
     address  public immutable i_owner;
     uint256 public sum;
     event SumUpdated(uint256 x, uint256 y, uint256 sum, address indexed updater);

     constructor(){
         i_owner =msg.sender;
     }

     modifier onlyOwner(){
        require(msg.sender==i_owner, "only owner");
        _;
     }

     function addNumbers(uint256 x, uint256 y) public returns(uint256){
        uint256 s = x + y;
        sum = s;
        emit SumUpdated(x, y, s, msg.sender);
        return s;
     }

     function getHello() public pure returns(string memory){
        return ("Hello, polkadot!!!");
     }
}