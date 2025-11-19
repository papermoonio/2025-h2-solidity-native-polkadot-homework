// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ERC1967Proxy {
    bytes32 internal constant _IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    bytes32 internal constant _ADMIN_SLOT =
        0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

    event Upgraded(address indexed implementation);
    event AdminChanged(address previousAdmin, address newAdmin);

    constructor(address _implementation) {
        require(_implementation != address(0), "impl-zero");
        _setAdmin(msg.sender);
        _setImplementation(_implementation);
    }

    function _getAdmin() internal view returns (address adm) {
        bytes32 slot = _ADMIN_SLOT;
        assembly {
            adm := sload(slot)
        }
    }

    function _setAdmin(address newAdmin) internal {
        require(newAdmin != address(0), "admin-zero");
        bytes32 slot = _ADMIN_SLOT;
        assembly {
            sstore(slot, newAdmin)
        }
    }

    function _getImplementation() internal view returns (address impl) {
        bytes32 slot = _IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }
    }

    function _setImplementation(address newImpl) internal {
        require(newImpl != address(0), "impl-zero");
        bytes32 slot = _IMPLEMENTATION_SLOT;
        assembly {
            sstore(slot, newImpl)
        }
        emit Upgraded(newImpl);
    }

    modifier onlyAdmin() {
        require(msg.sender == _getAdmin(), "only-admin");
        _;
    }

    function upgradeTo(address newImpl) external onlyAdmin {
        _setImplementation(newImpl);
    }

    function changeAdmin(address newAdmin) external onlyAdmin {
        address prev = _getAdmin();
        _setAdmin(newAdmin);
        emit AdminChanged(prev, newAdmin);
    }

    fallback() external payable {
        _delegate();
    }

    receive() external payable {
        _delegate();
    }

    function _delegate() internal {
        address impl = _getImplementation();
        require(impl != address(0), "impl-not-set");

        assembly {
            calldatacopy(0x0, 0x0, calldatasize())
            let result := delegatecall(gas(), impl, 0x0, calldatasize(), 0x0, 0)
            returndatacopy(0x0, 0x0, returndatasize())
            switch result
            case 0 { revert(0x0, returndatasize()) }
            default { return(0x0, returndatasize()) }
        }
    }

    function getCounter() external view returns (uint256 val) {
        bytes32 slot = bytes32(uint256(0));
        assembly {
            val := sload(slot)
        }
    }

    function implementation() external view returns (address) {
        return _getImplementation();
    }

    function admin() external view returns (address) {
        return _getAdmin();
    }
}