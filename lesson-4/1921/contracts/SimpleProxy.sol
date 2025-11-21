// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SimpleProxy
 * @dev 简单的代理合约 - 实现 delegatecall 模式
 * 
 * 🎯 学习要点：
 * 1. 代理合约保存状态数据
 * 2. 通过 delegatecall 执行逻辑合约的代码
 * 3. 可以升级逻辑合约而不丢失状态
 * 4. 存储槽位必须与逻辑合约匹配！
 */
contract SimpleProxy {
    // 📦 槽位0：计数器值 (必须与 SimpleCounter 的槽位0对应)
    uint256 public count;
    
    // 📦 槽位1：合约所有者 (必须与 SimpleCounter 的槽位1对应)
    address public owner;
    
    // 📦 槽位2：逻辑合约地址 (代理特有的状态)
    address public implementation;
    
    // 🎯 事件
    event ImplementationUpgraded(address indexed oldImplementation, address indexed newImplementation);
    event ProxyCallExecuted(address indexed caller, bytes data);
    
    /**
     * @dev 构造函数
     * @param _implementation 逻辑合约地址
     * @param _owner 代理合约所有者
     */
    constructor(address _implementation, address _owner) {
        require(_implementation != address(0), "Implementation cannot be zero address");
        require(_owner != address(0), "Owner cannot be zero address");
        
        implementation = _implementation;
        owner = _owner;
        count = 0; // 初始化计数器
    }
    
    /**
     * @dev 只有所有者可以调用的修饰符
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    /**
     * @dev 升级逻辑合约
     * @param newImplementation 新的逻辑合约地址
     */
    function upgrade(address newImplementation) external onlyOwner {
        require(newImplementation != address(0), "New implementation cannot be zero address");
        require(newImplementation != implementation, "New implementation must be different");
        
        address oldImplementation = implementation;
        implementation = newImplementation;
        
        emit ImplementationUpgraded(oldImplementation, newImplementation);
    }
    
    /**
     * @dev 获取当前逻辑合约地址
     * @return 逻辑合约地址
     */
    function getImplementation() external view returns (address) {
        return implementation;
    }
    
    /**
     * @dev Fallback 函数 - 核心的 delegatecall 逻辑
     * 🔍 当调用代理合约不存在的函数时，会进入这里
     * 
     * 执行流程：
     * 1. 获取逻辑合约地址
     * 2. 使用 delegatecall 调用逻辑合约
     * 3. 返回执行结果
     */
    fallback() external payable {
        address impl = implementation;
        require(impl != address(0), "Implementation not set");
        
        emit ProxyCallExecuted(msg.sender, msg.data);
        
        // 🚀 关键：使用内联汇编实现 delegatecall
        assembly {
            // 步骤1: 复制调用数据到内存
            // calldatacopy(目标位置, 源位置, 长度)
            calldatacopy(0, 0, calldatasize())
            
            // 步骤2: 执行 delegatecall
            // delegatecall(gas, 目标地址, 输入数据位置, 输入数据长度, 输出数据位置, 输出数据长度)
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            
            // 步骤3: 复制返回数据
            // returndatacopy(目标位置, 源位置, 长度)
            returndatacopy(0, 0, returndatasize())
            
            // 步骤4: 根据执行结果返回或回滚
            switch result
            case 0 { 
                // 如果 delegatecall 失败，回滚交易
                revert(0, returndatasize()) 
            }
            default { 
                // 如果成功，返回数据
                return(0, returndatasize()) 
            }
        }
    }
    
    /**
     * @dev Receive 函数 - 接收 ETH
     */
    receive() external payable {
        // 记录接收到的 ETH
        emit ProxyCallExecuted(msg.sender, "");
    }
}
