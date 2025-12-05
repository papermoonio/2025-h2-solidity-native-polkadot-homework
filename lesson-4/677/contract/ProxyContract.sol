// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ProxyContract - 代理合約實現
 * @dev 這個合約展示了如何使用 delegatecall 實現可升級的智能合約模式
 * 
 * 核心概念：
 * 1. 代理合約持有狀態（存儲）
 * 2. 邏輯合約包含業務邏輯
 * 3. 使用 delegatecall 在代理合約的上下文中執行邏輯合約的代碼
 * 
 * 優點：
 * - 可升級性：可以替換邏輯合約而不影響現有狀態
 * - 狀態分離：邏輯合約不存儲狀態，減少部署成本
 * - 邏輯重用：多個代理合約可以使用同一個邏輯合約
 * 
 */
contract ProxyContract {
    // ============================================
    // 存儲變量聲明
    // ============================================
    
    /**
     * @dev 重要：存儲布局必須與邏輯合約完全一致！
     * 這兩個變量必須與 LogicContract 中的變量順序和類型完全相同。
     * 如果存儲布局不匹配，會導致嚴重的數據損壞。
     */
    uint256 public count;  // 計數器，用於演示狀態變化
    address public owner;  // 合約所有者地址
    
    /**
     * @dev 額外的存儲變量可以放在邏輯合約的存儲變量之後
     * 這是代理合約特有的變量，用於存儲當前邏輯合約地址
     */
    address public logicContract;  // 當前邏輯合約地址
    
    // ============================================
    // 事件定義
    // ============================================
    
    /**
     * @dev 當邏輯合約升級時觸發
     * @param oldLogic 舊的邏輯合約地址
     * @param newLogic 新的邏輯合約地址
     */
    event LogicUpdated(address indexed oldLogic, address indexed newLogic);
    
    /**
     * @dev 當執行 delegatecall 時觸發
     * @param target 目標邏輯合約地址
     * @param data 執行的函數數據
     * @param success 執行是否成功
     */
    event CallExecuted(address indexed target, bytes data, bool success);
    
    // ============================================
    // 建構子
    // ============================================
    
    /**
     * @dev 建構子，部署時初始化代理合約
     * @param _logicContract 初始邏輯合約地址
     * 
     * 注意：這裡不直接設置 owner，而是通過 delegatecall 調用邏輯合約的 initialize()
     * 這樣可以確保所有者的設置邏輯在邏輯合約中統一管理。
     * 
     * 工作流程：
     * 1. 存儲邏輯合約地址
     * 2. 使用 delegatecall 調用邏輯合約的 initialize() 函數
     * 3. 在代理合約的上下文中執行初始化邏輯
     */
    constructor(address _logicContract) {
        logicContract = _logicContract;  // 設置初始邏輯合約地址
        
        // 使用 delegatecall 初始化邏輯合約的狀態
        // abi.encodeWithSignature("initialize()") 創建函數調用數據
        // delegatecall 在代理合約的存儲上下文中執行邏輯合約的代碼
        (bool success, ) = _logicContract.delegatecall(
            abi.encodeWithSignature("initialize()")
        );
        require(success, "Initialization failed");  // 如果初始化失敗，則回滾交易
    }
    
    // ============================================
    // 管理函數
    // ============================================
    
    /**
     * @dev 更新邏輯合約地址（只有所有者可以調用）
     * @param _newLogic 新的邏輯合約地址
     * 
     * 功能：
     * - 允許合約所有者升級邏輯合約
     * - 發出 LogicUpdated 事件
     * - 更新 logicContract 狀態變量
     * 
     * 安全檢查：
     * 1. 只有所有者可以調用
     * 2. 新地址不能是零地址
     */
    function updateLogic(address _newLogic) external {
        require(msg.sender == owner, "Only owner can update logic");
        require(_newLogic != address(0), "Invalid logic address");
        
        emit LogicUpdated(logicContract, _newLogic);  // 記錄升級事件
        logicContract = _newLogic;  // 更新邏輯合約地址
    }
    
    // ============================================
    // 業務邏輯函數
    // ============================================
    
    /**
     * @dev 使用 delegatecall 執行邏輯合約的 increment 函數
     * @return success 執行是否成功
     * 
     * 功能：
     * - 調用邏輯合約的 increment() 函數
     * - 在代理合約的上下文中執行
     * - 發出 CallExecuted 事件
     * 
     * 工作流程：
     * 1. 檢查調用者是否為所有者
     * 2. 使用 delegatecall 調用 increment() 函數
     * 3. 記錄執行結果
     */
    function executeIncrement() external returns (bool) {
        require(msg.sender == owner, "Only owner can execute");
        
        // 使用 delegatecall 調用邏輯合約的 increment 函數
        // 注意：delegatecall 會使用代理合約的存儲上下文
        // 所以邏輯合約對 count 的修改實際上是修改代理合約的 count
        (bool success, ) = logicContract.delegatecall(
            abi.encodeWithSignature("increment()")
        );
        
        emit CallExecuted(logicContract, abi.encodeWithSignature("increment()"), success);
        return success;
    }
    
    /**
     * @dev 通用的 delegatecall 函數，可以調用邏輯合約的任何函數
     * @param data 要調用的函數數據（使用 abi.encodeWithSignature 生成）
     * @return success 執行是否成功
     * @return result 函數返回的原始字節數據
     * 
     * 用途：
     * - 調用邏輯合約中沒有在代理合約中明確定義的函數
     * - 提供最大的靈活性
     * 
     * 注意：
     * - 調用者必須是所有者
     * - 需要手動處理返回值的解碼
     */
    function delegateCall(bytes memory data) external returns (bool, bytes memory) {
        require(msg.sender == owner, "Only owner can delegate call");
        
        // 執行通用的 delegatecall
        // 返回值和錯誤處理需要額外注意
        (bool success, bytes memory result) = logicContract.delegatecall(data);
        
        emit CallExecuted(logicContract, data, success);
        return (success, result);
    }
    
    // ============================================
    // 視圖函數
    // ============================================
    
    /**
     * @dev 獲取當前計數（從代理合約存儲讀取）
     * @return 當前計數值
     * 
     * 說明：
     * - 直接讀取代理合約的 count 變量
     * - 這反映了通過 delegatecall 修改後的狀態
     */
    function getCount() external view returns (uint256) {
        return count;
    }
    
    /**
     * @dev 獲取邏輯合約的計數（直接從邏輯合約查詢）
     * @return 邏輯合約中的計數值
     * 
     * 用途：
     * - 比較代理合約和邏輯合約的狀態
     * - 驗證 delegatecall 的正確性
     * 
     * 技術：
     * - 使用 staticcall 進行只讀調用
     * - 不消耗 gas（view 函數）
     * - 不修改任何狀態
     */
    function getLogicCount() external view returns (uint256) {
        (bool success, bytes memory result) = logicContract.staticcall(
            abi.encodeWithSignature("getCount()")
        );
        require(success, "Static call failed");
        return abi.decode(result, (uint256));
    }
}
