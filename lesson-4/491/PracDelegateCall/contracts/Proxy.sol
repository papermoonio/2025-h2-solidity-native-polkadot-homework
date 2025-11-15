// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Proxy {
    uint256 public counter;
    address private impl;

    constructor(address _impl) {
        impl = _impl;
        counter = 100;
    }

    function callInc() external {
        address target = impl;
        bytes4 selector = bytes4(keccak256("Inc()"));
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, selector)
            let result := delegatecall(
                gas(),
                target,
                ptr, 
                0x04,
                0,
                0
            )

            // 检查返回结果
            if eq(result, 0) {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
    }

    function getImpl() external view returns (address) {
        return impl;
    }
}
