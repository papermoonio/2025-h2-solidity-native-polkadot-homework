// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Proxy
 * @dev 代理合约，使用delegatecall来调用逻辑合约
 * 代理合约保持状态，逻辑合约提供实现
 */
contract Proxy {
    // 状态变量 - 这些变量的存储位置与逻辑合约相同
    uint256 public counter;
    address public owner;
    mapping(address => uint256) public userCounters;

    // 逻辑合约地址
    address public logicContract;

    // 事件
    event LogicContractUpdated(address indexed newLogicContract);
    event DelegateCallExecuted(address indexed target, bytes data);

    /**
     * @dev 初始化代理合约
     */
    constructor(address _logicContract) {
        require(_logicContract != address(0), "Logic contract cannot be zero address");
        logicContract = _logicContract;
        owner = msg.sender;
    }

    /**
     * @dev 更新逻辑合约地址（仅owner可调用）
     */
    function updateLogicContract(address newLogicContract) public {
        require(msg.sender == owner, "Only owner can update logic contract");
        require(newLogicContract != address(0), "New logic contract cannot be zero address");
        logicContract = newLogicContract;
        emit LogicContractUpdated(newLogicContract);
    }

    /**
     * @dev 通过delegatecall调用逻辑合约的increment函数
     */
    function increment() public {
        _delegateCall(
            abi.encodeWithSignature("increment()")
        );
    }

    /**
     * @dev 通过delegatecall调用逻辑合约的incrementBy函数
     */
    function incrementBy(uint256 amount) public {
        _delegateCall(
            abi.encodeWithSignature("incrementBy(uint256)", amount)
        );
    }

    /**
     * @dev 通过delegatecall调用逻辑合约的decrement函数
     */
    function decrement() public {
        _delegateCall(
            abi.encodeWithSignature("decrement()")
        );
    }

    /**
     * @dev 通过delegatecall调用逻辑合约的reset函数
     */
    function reset() public {
        _delegateCall(
            abi.encodeWithSignature("reset()")
        );
    }

    /**
     * @dev 通过delegatecall调用逻辑合约的initialize函数
     */
    function initialize(address _owner) public {
        _delegateCall(
            abi.encodeWithSignature("initialize(address)", _owner)
        );
    }

    /**
     * @dev 通过delegatecall调用逻辑合约的changeOwner函数
     */
    function changeOwner(address newOwner) public {
        _delegateCall(
            abi.encodeWithSignature("changeOwner(address)", newOwner)
        );
    }

    /**
     * @dev 获取当前计数器值
     */
    function getCounter() public view returns (uint256) {
        return counter;
    }

    /**
     * @dev 获取用户的计数器值
     */
    function getUserCounter(address user) public view returns (uint256) {
        return userCounters[user];
    }

    /**
     * @dev 内部函数：执行delegatecall
     */
    function _delegateCall(bytes memory data) internal {
        (bool success, bytes memory result) = logicContract.delegatecall(data);
        
        require(success, _getRevertReason(result));
        emit DelegateCallExecuted(logicContract, data);
    }

    /**
     * @dev 获取revert原因
     */
    function _getRevertReason(bytes memory result) internal pure returns (string memory) {
        if (result.length < 68) return "Transaction reverted silently";
        
        assembly {
            result := add(result, 0x04)
        }
        return abi.decode(result, (string));
    }

    /**
     * @dev 回退函数，允许任何其他调用都通过delegatecall转发
     */
    fallback() external payable {
        address target = logicContract;
        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize())
            let result := delegatecall(gas(), target, ptr, calldatasize(), 0, 0)
            returndatacopy(ptr, 0, returndatasize())
            switch result
            case 0 {
                revert(ptr, returndatasize())
            }
            default {
                return(ptr, returndatasize())
            }
        }
    }

    /**
     * @dev 接收函数，允许合约接收ETH
     */
    receive() external payable {}
}
