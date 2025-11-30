// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MintableERC20
 * @dev 可鑄造的 ERC20 代幣合約，具有時間限制的鑄造功能和管理員權限
 * 
 * 主要功能:
 * - 標準 ERC20 功能
 * - 時間限制的用戶鑄造 (每小時限制)
 * - 管理員無限制鑄造
 * - 可調整鑄造冷卻時間
 * - 所有權管理
 */
contract MintableERC20 is ERC20, Ownable {
    // =============================================================
    //                          常量定義
    // =============================================================
    
    /// @dev 默認鑄造間隔時間 (1小時)
    uint256 public constant DEFAULT_MINT_INTERVAL = 3600;
    
    /// @dev 每次用戶鑄造的數量 (100個代幣)
    uint256 public constant USER_MINT_AMOUNT = 100 * 10**18;
    
    /// @dev 初始供應量 (100,000個代幣)
    uint256 public constant INITIAL_SUPPLY = 100000 * 10**18;
    
    // =============================================================
    //                          狀態變量
    // =============================================================
    
    /// @dev 記錄每個地址最後一次鑄造的時間戳
    mapping(address => uint256) public lastMintTime;
    
    /// @dev 用戶鑄造的最小時間間隔 (秒)
    uint256 public mintInterval;
    
    // =============================================================
    //                          事件定義
    // =============================================================
    
    /**
     * @dev 用戶鑄造代幣時觸發
     * @param minter 鑄造者地址
     * @param amount 鑄造數量
     * @param nextAvailableMint 下一次可鑄造的時間戳
     */
    event UserMint(
        address indexed minter,
        uint256 amount,
        uint256 nextAvailableMint
    );
    
    /**
     * @dev 管理員鑄造代幣時觸發
     * @param target 接收地址
     * @param amount 鑄造數量
     */
    event OwnerMint(
        address indexed target,
        uint256 amount
    );
    
    /**
     * @dev 鑄造間隔時間更新時觸發
     * @param oldInterval 舊的間隔時間
     * @param newInterval 新的間隔時間
     */
    event MintIntervalUpdated(
        uint256 oldInterval,
        uint256 newInterval
    );
    
    // =============================================================
    //                          構造函數
    // =============================================================
    
    /**
     * @dev 初始化代幣合約
     * @param name_ 代幣名稱
     * @param symbol_ 代幣符號
     * 
     * 初始化流程:
     * 1. 設置代幣名稱和符號
     * 2. 將初始供應量分配給合約部署者
     * 3. 設置默認鑄造間隔時間
     * 4. 轉移所有權給部署者
     */
    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        // 鑄造初始供應量給部署者
        _mint(msg.sender, INITIAL_SUPPLY);
        
        // 設置默認鑄造間隔
        mintInterval = DEFAULT_MINT_INTERVAL;
    }
    
    // =============================================================
    //                          用戶功能
    // =============================================================
    
    /**
     * @dev 用戶鑄造代幣功能
     * 
     * 要求:
     * - 用戶必須等待指定的時間間隔後才能再次鑄造
     * 
     * 效果:
     * - 鑄造固定數量的代幣給調用者
     * - 更新用戶最後一次鑄造時間
     * - 觸發 UserMint 事件
     * 
     * 安全考慮:
     * - 使用 require 進行輸入驗證
     * - 防止重入攻擊 (ERC20 標準已處理)
     */
    function mintToken() external {
        address user = msg.sender;
        
        // 檢查是否滿足鑄造時間條件
        require(
            canMint(user),
            "MintableERC20: Must wait for cooldown period"
        );
        
        // 執行鑄造
        _mint(user, USER_MINT_AMOUNT);
        
        // 更新最後鑄造時間
        lastMintTime[user] = block.timestamp;
        
        // 觸發事件
        emit UserMint(user, USER_MINT_AMOUNT, block.timestamp + mintInterval);
    }
    
    /**
     * @dev 檢查指定地址是否可以鑄造代幣
     * @param user 要檢查的地址
     * @return 如果用戶可以鑄造返回 true，否則返回 false
     */
    function canMint(address user) public view returns (bool) {
        // 如果是第一次鑄造，或者已經過了冷卻時間，則可以鑄造
        return lastMintTime[user] == 0 || 
               block.timestamp >= lastMintTime[user] + mintInterval;
    }
    
    /**
     * @dev 獲取用戶下一次可以鑄造的時間戳
     * @param user 要查詢的地址
     * @return 下一次可以鑄造的時間戳 (如果現在可以鑄造，返回0)
     */
    function nextMintTime(address user) external view returns (uint256) {
        if (canMint(user)) {
            return 0;
        }
        return lastMintTime[user] + mintInterval;
    }
    
    /**
     * @dev 獲取用戶還需要等待多少秒才能再次鑄造
     * @param user 要查詢的地址
     * return 還需要等待的秒數 (如果現在可以鑄造，返回0)
     */
    function remainingMintTime(address user) external view returns (uint256) {
        if (canMint(user)) {
            return 0;
        }
        
        uint256 nextTime = lastMintTime[user] + mintInterval;
        if (block.timestamp >= nextTime) {
            return 0;
        }
        
        return nextTime - block.timestamp;
    }
    
    // =============================================================
    //                          管理員功能
    // =============================================================
    
    /**
     * @dev 管理員鑄造功能 - 無時間限制
     * @param target 接收代幣的地址
     * @param amount 鑄造數量
     * 
     * 要求:
     * - 只有合約所有者可以調用
     * - 接收地址不能為零地址
     * - 鑄造數量必須大於0
     * 
     * 效果:
     * - 鑄造指定數量的代幣給目標地址
     * - 觸發 OwnerMint 事件
     */
    function ownerMint(address target, uint256 amount) external onlyOwner {
        require(target != address(0), "MintableERC20: Cannot mint to zero address");
        require(amount > 0, "MintableERC20: Mint amount must be positive");
        
        _mint(target, amount);
        emit OwnerMint(target, amount);
    }
    
    /**
     * @dev 更新鑄造間隔時間
     * @param newInterval 新的鑄造間隔時間 (秒)
     * 
     * 要求:
     * - 只有合約所有者可以調用
     * - 新的間隔時間必須大於0
     * 
     * 效果:
     * - 更新鑄造間隔時間
     * - 觸發 MintIntervalUpdated 事件
     */
    function setMintInterval(uint256 newInterval) external onlyOwner {
        require(newInterval > 0, "MintableERC20: Interval must be positive");
        
        uint256 oldInterval = mintInterval;
        mintInterval = newInterval;
        
        emit MintIntervalUpdated(oldInterval, newInterval);
    }
    
    // =============================================================
    //                          工具函數
    // =============================================================
    
    /**
     * @dev 獲取合約信息摘要
     * return 包含代幣名稱、符號、總供應量和當前鑄造間隔的對象
     */
    function getTokenInfo() external view returns (
        string memory,
        string memory,
        uint256,
        uint256
    ) {
        return (
            name(),
            symbol(),
            totalSupply(),
            mintInterval
        );
    }
    
    /**
     * @dev 獲取用戶鑄造信息
     * @param user 要查詢的用戶地址
     * return 包含用戶余額、最後鑄造時間、是否可以鑄造和剩餘等待時間的對象
     */
    function getUserMintInfo(address user) external view returns (
        uint256 balance,
        uint256 lastMint,
        bool canMintNow,
        uint256 remainingTime
    ) {
        balance = balanceOf(user);
        lastMint = lastMintTime[user];
        canMintNow = canMint(user);
        
        if (canMintNow) {
            remainingTime = 0;
        } else {
            remainingTime = lastMint + mintInterval - block.timestamp;
        }
    }
}