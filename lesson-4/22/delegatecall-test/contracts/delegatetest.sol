// ...existing code...
pragma solidity ^0.8.19;

contract Logic {
    // slot 0: value
    uint256 public value;
    event Increment(address indexed sender, uint256 newValue);

    function increment() public {
        // 在 delegatecall 情况下，这里修改的是调用合约（即 proxy）的 storage
        value += 1;
        emit Increment(msg.sender, value);
    }
}

contract Proxy {
    // IMPORTANT:
    // 保证 storage 布局与 Logic 一致 —— value 必须在 slot 0
    uint256 public value;        // slot 0: will be modified when logic.increment() is delegatecalled
    address public implementation; // slot 1

    event Upgraded(address indexed impl);
    event Called(address indexed impl, bytes data);

    constructor(address _impl) {
        implementation = _impl;
    }

    function setImplementation(address _impl) external {
        implementation = _impl;
        emit Upgraded(_impl);
    }

    // 专门的 wrapper，使用 delegatecall 调用 logic.increment()
    function increment() external returns (bool) {
        (bool success, bytes memory ret) = implementation.delegatecall(
            abi.encodeWithSignature("increment()")
        );
        emit Called(implementation, msg.data);
        return success;
    }

    // 通用的 fallback，将任意调用代理到 implementation（delegatecall）
    fallback() external payable {
        (bool success, bytes memory ret) = implementation.delegatecall(msg.data);
        // 将被代理合约的返回或 revert 原样抛出
        if (!success) {
            assembly {
                let ptr := add(ret, 0x20)
                let size := mload(ret)
                revert(ptr, size)
            }
        } else {
            assembly {
                let ptr := add(ret, 0x20)
                let size := mload(ret)
                return(ptr, size)
            }
        }
    }

    receive() external payable {}
}
// ...existing code...