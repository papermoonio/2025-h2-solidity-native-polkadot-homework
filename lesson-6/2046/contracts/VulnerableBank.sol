// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;




contract VulnerableBank {

    event Log(uint256 value, address sender);
    mapping(address => uint256) public balances;

    // 存款（安全）
    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    // 提现（存在重入漏洞）
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        emit Log(amount, msg.sender);
        // 漏洞：先转账，再更新余额（攻击者可以重入）
        (bool success, bytes memory data) = msg.sender.call{value: amount}("");
        
        require(success, "transfer fail");

        balances[msg.sender] -= amount;
    }

    // 查询余额
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}