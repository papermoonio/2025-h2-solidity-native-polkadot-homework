// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Proxy
 * @dev 代理合约，使用 delegatecall 通过 fallback 函数代理所有调用
 */
contract Proxy {
    // 状态变量必须与逻辑合约的存储布局一致
    uint256 public counter;
    
    // 逻辑合约的地址
    address public logicContract;
    
    /**
     * @dev 构造函数，设置逻辑合约地址
     * @param _logicContract 逻辑合约的地址
     */
    constructor(address _logicContract) {
        logicContract = _logicContract;
    }
    
    /**
     * @dev Fallback 函数，将所有调用委托给逻辑合约
     * 使用 delegatecall 在当前合约的上下文中执行逻辑合约的代码
     */
    fallback() external payable {
        address _impl = logicContract;
        assembly {
            // 将 calldata 复制到内存
            calldatacopy(0, 0, calldatasize())
            
            // 使用 delegatecall 调用逻辑合约
            let result := delegatecall(gas(), _impl, 0, calldatasize(), 0, 0)
            
            // 将返回数据复制到内存
            returndatacopy(0, 0, returndatasize())
            
            // 根据调用结果返回或回滚
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
    
    /**
     * @dev Receive 函数，接收以太币
     */
    receive() external payable {}
}
