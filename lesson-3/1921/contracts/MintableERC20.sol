// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MintableERC20
 * @dev ERC20代币合约，支持用户定期铸造代币
 * @author Student 1921
 */
contract MintableERC20 is ERC20 {
    // 用户上次铸造代币的时间戳
    mapping(address => uint256) public lastMintTimestamp;
    
    // 铸造间隔时间（秒）
    uint256 public interval;
    
    // 合约所有者
    address public owner;
    
    // 每次铸造的代币数量（18位小数）
    uint256 public constant MINT_AMOUNT = 1000000000000000000; // 1 token
    
    // 事件定义
    event TokenMinted(address indexed user, uint256 amount, uint256 timestamp);
    event IntervalUpdated(uint256 oldInterval, uint256 newInterval);
    
    /**
     * @dev 构造函数
     * @param name 代币名称
     * @param symbol 代币符号
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        interval = 1 hours; // 默认1小时间隔
        owner = msg.sender; // 部署者为所有者
    }
    
    /**
     * @dev 用户铸造代币功能
     * 要求：必须满足时间间隔限制
     */
    function mintToken() public {
        require(canMint(msg.sender), "Minting too frequently - please wait");
        
        // 更新用户最后铸造时间
        lastMintTimestamp[msg.sender] = block.timestamp;
        
        // 铸造代币给用户
        _mint(msg.sender, MINT_AMOUNT);
        
        // 触发事件
        emit TokenMinted(msg.sender, MINT_AMOUNT, block.timestamp);
    }
    
    /**
     * @dev 检查用户是否可以铸造代币
     * @param user 用户地址
     * @return bool 是否可以铸造
     */
    function canMint(address user) public view returns (bool) {
        // 如果是第一次铸造，或者已经过了间隔时间，则可以铸造
        return lastMintTimestamp[user] == 0 || 
               block.timestamp >= lastMintTimestamp[user] + interval;
    }
    
    /**
     * @dev 获取用户距离下次可铸造的剩余时间
     * @param user 用户地址
     * @return uint256 剩余秒数，0表示可以立即铸造
     */
    function getRemainingTime(address user) public view returns (uint256) {
        if (canMint(user)) {
            return 0;
        }
        return (lastMintTimestamp[user] + interval) - block.timestamp;
    }
    
    /**
     * @dev 所有者设置铸造间隔时间
     * @param newInterval 新的间隔时间（秒）
     */
    function setInterval(uint256 newInterval) public {
        require(msg.sender == owner, "Only owner can set interval");
        require(newInterval > 0, "Interval must be greater than 0");
        
        uint256 oldInterval = interval;
        interval = newInterval;
        
        emit IntervalUpdated(oldInterval, newInterval);
    }
    
    /**
     * @dev 转移所有权
     * @param newOwner 新所有者地址
     */
    function transferOwnership(address newOwner) public {
        require(msg.sender == owner, "Only owner can transfer ownership");
        require(newOwner != address(0), "New owner cannot be zero address");
        
        owner = newOwner;
    }
}
