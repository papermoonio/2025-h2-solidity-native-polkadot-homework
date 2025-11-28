// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract VulnerableBank {
  mapping(address => uint) public balances;

  function deposit() public payable {
    balances[msg.sender] += msg.value;
  }

  function withdraw(uint amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    // 漏洞：在转账前没有更新余额
    // 外部调用会在这里执行接收者的代码（如果接收者是合约）
    // 此时 balances[msg.sender] 还没有被减少，导致重入漏洞！
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
    
    // 状态更新发生在外部调用之后 - 这就是漏洞
    balances[msg.sender] -= amount;
  }

  function getBalance() public view returns (uint) {
    return address(this).balance;
  }
}