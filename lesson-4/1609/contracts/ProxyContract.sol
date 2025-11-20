// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./LogicContract.sol";

/**
 * @title 代理合约
 * @dev 使用delegatecall调用逻辑合约的函数，保持自己的状态
 */
contract ProxyContract {
    // 关键：将逻辑合约地址存储在插槽1，而不是插槽0
    // 这样插槽0可以留给counter变量，确保与LogicContract的存储布局兼容
    
    // 这个计数器必须在存储插槽0，与LogicContract中的counter保持一致
    uint256 public counter;
    
    // 逻辑合约地址存储在插槽1
    address private logicContract;
    
    /**
     * @dev 构造函数，设置逻辑合约地址
     * @param _logicContractAddress 逻辑合约的地址
     */
    constructor(address _logicContractAddress) {
        logicContract = _logicContractAddress;
    }
    
    /**
     * @dev 获取逻辑合约地址
     * @return 逻辑合约地址
     */
    function logicContractAddress() public view returns (address) {
        return logicContract;
    }
    
    /**
     * @dev 调用逻辑合约的increment函数
     * @return 调用结果
     */
    function increment() public returns (uint256) {
        // 直接使用logicContract变量
        (bool success, bytes memory data) = logicContract.delegatecall(
            abi.encodeWithSelector(LogicContract.increment.selector)
        );
        
        require(success, "Delegate call failed");
        
        // 解码返回值
        if (data.length > 0) {
            return abi.decode(data, (uint256));
        }
        
        // 如果没有返回数据，直接返回当前计数器值
        return counter;
    }
    
    /**
     * @dev 直接返回代理合约存储中的计数器值
     * @return 当前计数值
     */
    function getCounter() public view returns (uint256) {
        return counter;
    }
    
    /**
     * @dev 设置新的逻辑合约地址
     * @param _newLogicAddress 新的逻辑合约地址
     */
    function setLogicContract(address _newLogicAddress) public {
        logicContract = _newLogicAddress;
    }
}