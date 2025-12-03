// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VulnerableBank {
    mapping(address => uint256) public balances;
    
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    
    // 存款函數
    function deposit() external payable {
        require(msg.value > 0, "Must deposit some ether");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
    
    // 有重入漏洞的提款函數
    function withdraw() external {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "Insufficient balance");
        
        // 漏洞：先發送資金，後更新狀態
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
        
        // 狀態更新在外部調用之後，易受重入攻擊
        balances[msg.sender] = 0;
        
        emit Withdrawn(msg.sender, balance);
    }
    
    // 獲取合約餘額
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // 獲取用戶餘額
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
}