// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    // 初始供应量，这里设为 1000000 个代币，注意要乘以 10**decimals()
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10**18; 

    // 构造函数
    // 1. 设置代币名称和符号
    // 2. 将合约部署者设置为所有者 (Ownable)
    // 3. 将初始供应量铸造给合约部署者
    constructor() 
        ERC20("My Awesome Token", "MAT")
        Ownable(msg.sender) // 设置初始所有者
    {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    // 示例：一个仅所有者可调用的铸币（mint）函数
    // 允许所有者增加代币总供应量并发送给指定地址
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}