// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.4.26;


library BytesLib {
    function concat(bytes4 a, bytes memory b)
        internal
        pure
        returns (bytes memory)
    {
        bytes memory result = new bytes(a.length + b.length);

        uint k = 0;
        for (uint i = 0; i < a.length; i++) {
            result[k++] = a[i];
        }
        for (i = 0; i < b.length; i++) {
            result[k++] = b[i];
        }
        return result;
    }
}

/**
 * @title ERC223Token
 * @notice ERC223代币实现，支持tokenFallback机制
 */
interface IERC223Receiver {
    function tokenFallback(address from, uint256 value, bytes data) external;
}

contract VulnERC223Token {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value, bytes data);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _initialSupply;
        balanceOf[msg.sender] = _initialSupply;
    }
    
    function transferFrom(address from, address to, uint256 value, bytes data) external {
        require(balanceOf[from] >= value, "Insufficient balance");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        
        if (isContract(to)) {
            IERC223Receiver(to).tokenFallback(from, value, data);
        }
        emit Transfer(from, to, value, data);
    }
    function transfer(address to, uint256 value, bytes data) external {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        
        if (isContract(to)) {
            IERC223Receiver(to).tokenFallback(msg.sender, value, data);
        }
        
        emit Transfer(msg.sender, to, value, data);
    }

    /**
     * @notice 授权spender可以使用owner的代币
     * @param spender 被授权的地址
     * @param value 授权金额
     */
    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    /**
     * @notice 从from地址转账到to地址（需要授权）
     * @dev 验证approve授权，然后执行转账和自定义回调
     * @param from 发送地址
     * @param to 接收地址
     * @param value 转账金额
     * @param data 附加数据
     * @param custom_callback 自定义回调函数名
     */
    function transferFrom(address from, address to, uint256 value, bytes data, string  custom_callback) external returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][to] >= value, "Insufficient allowance");
        
        // 更新余额和授权
        balanceOf[from] -= value;
        allowance[from][to] -= value;
        balanceOf[to] += value;
        
        bool _success = false;
        if (isContract(to) && bytes(custom_callback).length > 0) {
            _success = address(to).call.value(0)(BytesLib.concat(bytes4(keccak256(bytes(custom_callback))),data));
        }
        emit Transfer(from, to, value, data);
        return _success;
    }
    
    function transfer(address to, uint256 value) external returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        
        emit Transfer(msg.sender, to, value, "");
        return false;
    }
    
    function isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }
}

/**
 * @title DSAuth
 * @notice DS-Auth权限管理系统（简化版）
 * @dev 提供owner和authority管理功能
 */
contract DSAuth {
    address public owner;
    
    event SetOwner(address indexed oldOwner, address indexed newOwner);
    
    constructor() public {
        owner = msg.sender; 
    }
    
    /**
     * @notice 设置新的owner
     * @dev 只有当前owner可以调用
     */
    function setOwner(address newOwner) public auth {
        address oldOwner = owner;
        owner = newOwner;
        emit SetOwner(oldOwner, newOwner);
    }
    
    /**
     * @notice 权限检查修饰符
     * @dev VULNERABLE: 只检查msg.sender是owner或authority
     *      在transferFrom中，如果msg.sender是代币合约，且代币合约被允许，
     *      攻击者可以通过transferFrom的自定义回调来调用setOwner
     */
    modifier auth() {
        require(isAuthorized(msg.sender), "Not authorized");
        _;
    }
    
    /**
     * @notice 检查地址是否有权限
     * @dev 基础实现，子类可以重写
     */
    function isAuthorized(address src) internal view returns (bool) {
        if (src == owner) {
            return true;
        }
        if (src == address(this)) {
            return true;
        }
        return false;
    }
}
