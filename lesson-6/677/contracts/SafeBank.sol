// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SafeBank {
    mapping(address => uint256) public balances;
    
    // 重入保護鎖
    bool private _locked;
    
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    
    // 防止重入的修飾器
    modifier noReentrant() {
        require(!_locked, "No reentrancy");
        _locked = true;
        _;
        _locked = false;
    }
    
    // 存款函數
    function deposit() external payable noReentrant {
        require(msg.value > 0, "Must deposit some ether");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
    
    // 安全的提款函數
    function withdraw() external noReentrant {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "Insufficient balance");
        
        // 先更新狀態
        balances[msg.sender] = 0;
        
        // 後發送資金
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
        
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