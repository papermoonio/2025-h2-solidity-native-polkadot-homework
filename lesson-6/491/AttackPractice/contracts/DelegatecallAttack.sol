// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/**
 * @title DelegateLogic
 * @notice 被 delegatecall 调用的逻辑合约
 * @dev 存储布局必须与 VulnerableDelegateCaller 保持一致
 */
contract DelegateLogic {
    // 注意：这里的存储布局必须与 VulnerableDelegateCaller 的前几个变量一致
    address public owner;
    uint256 public someValue;

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event ValueChanged(uint256 oldValue, uint256 newValue);

    // 漏洞函数：没有任何权限检查
    function setOwner(address newOwner) external {
        address oldOwner = owner;
        owner = newOwner;
        emit OwnerChanged(oldOwner, newOwner);
    }

    // 另一个示例函数：修改 someValue
    function setValue(uint256 newValue) external {
        uint256 oldValue = someValue;
        someValue = newValue;
        emit ValueChanged(oldValue, newValue);
    }
}

/**
 * @title VulnerableDelegateCaller
 * @notice 漏洞合约：在 fallback 中对外部合约使用 delegatecall(msg.data)
 * @dev 攻击者可以构造任意函数调用（例如 setOwner），并通过 fallback + delegatecall
 *      在本合约的存储上下文中执行，从而修改关键变量（如 owner）
 */
contract VulnerableDelegateCaller {
    // 存储布局需要与 DelegateLogic 对齐
    address public owner;
    uint256 public someValue;
    address public logic; // 被 delegatecall 的逻辑合约地址

    event FallbackCalled(address indexed caller, bytes data, bool success);

    constructor(address _logic) {
        owner = msg.sender;
        logic = _logic;
    }

    // 仅示例用途的安全函数
    function setLogic(address _logic) external {
        require(msg.sender == owner, "Only owner");
        logic = _logic;
    }

    /**
     * @notice fallback 函数：对 logic 合约执行 delegatecall(msg.data)
     * @dev VULNERABILITY: 没有对 msg.data 做任何校验，任何人都可以调用任意逻辑
     *      只要 logic 合约中存在对应签名的函数（例如 setOwner(address)），
     *      就可以在本合约的存储中修改 owner
     */
    fallback() external payable {
        address impl = logic;
        require(impl != address(0), "Logic not set");

        (bool success, ) = impl.delegatecall(msg.data);
        emit FallbackCalled(msg.sender, msg.data, success);
        require(success, "Delegatecall failed");
    }

    receive() external payable {}
}


