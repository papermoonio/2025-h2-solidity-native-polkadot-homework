// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

contract proxy {
    // EIP-1967: 将逻辑地址存储在特定存储槽中，避免与逻辑合约存储冲突
    // keccak256("eip1967.proxy.implementation") - 1
    bytes32 private constant IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    constructor(address _logicAddress) {
        require(_logicAddress != address(0), "Invalid logic address");
        assembly {
            sstore(IMPLEMENTATION_SLOT, _logicAddress)
        }
    }

    function logicAddress() public view returns (address) {
        address impl;
        assembly {
            impl := sload(IMPLEMENTATION_SLOT)
        }
        return impl;
    }

    fallback() external payable {
        address impl;
        assembly {
            impl := sload(IMPLEMENTATION_SLOT)
        }
        _delegate(impl);
    }

    receive() external payable {}

    function _delegate(address implementation) internal {
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(0, 0, size)
            switch result
            case 0 { revert(0, size) }
            default { return(0, size) }
        }
    }

}
