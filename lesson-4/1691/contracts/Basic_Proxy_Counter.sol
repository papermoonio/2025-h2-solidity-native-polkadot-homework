// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// EIP-1967 简单代理合约，委托调用逻辑合约实现计数功能
contract Basic_Proxy_Counter{
    // EIP-1967 标准指定的实现合约地址存储槽，也可以自定义（需注意避免与其他状态变量冲突）
    bytes32 private constant IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
    bytes32 private constant ADMIN_SLOT = bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1);

    event Upgraded(address indexed implementation);

    // 读写槽工具
    function getAdmin() private view returns (address a) {
        bytes32 slot = ADMIN_SLOT;
        assembly { a := sload(slot) }
    }
    function setAddress(address a) private {
        bytes32 slot = ADMIN_SLOT;
        assembly { sstore(slot, a) }
    }

    // 对外暴露 owner “变量”的 getter（不占据实现的槽 0）
    function owner() public view returns (address) {
        return getAdmin();
    }

    modifier onlyOwner() {
        require(msg.sender == owner(), "Not owner");
        _;
    }

    constructor(address _logicContract) {
        setAddress(msg.sender);
        setImplementation(_logicContract);
    }

    function implemantation() public view returns (address impl) {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }
    }

    function setImplementation(address newImplementation) public onlyOwner {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            sstore(slot, newImplementation)
        }
    }

    function upgradeTo(address newImplementation, bytes calldata initData) external onlyOwner {
        setImplementation(newImplementation);
        if (initData.length > 0) {
            (bool success, ) = newImplementation.delegatecall(initData);
            require(success, "Initialization failed");
        }
        emit Upgraded(newImplementation);
    }

    fallback() external payable {
        address impl = implemantation();
        assembly {
            // 复制 msg.data
            calldatacopy(0, 0, calldatasize())
            // 委托调用逻辑合约
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            // 复制返回数据
            returndatacopy(0, 0, returndatasize())
            // 根据调用结果返回数据或错误
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}
}