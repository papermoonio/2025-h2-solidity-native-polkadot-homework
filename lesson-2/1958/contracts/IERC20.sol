// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ERC20 Token Standard Interface
 * @dev 定义了 ERC20 代币的标准接口
 */
interface IERC20 {
    /**
     * @dev 返回代币的总供应量
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev 返回指定账户的代币余额
     * @param account 要查询余额的账户地址
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev 将指定数量的代币转移到指定地址
     * @param to 接收代币的地址
     * @param amount 要转移的代币数量
     * @return 如果转移成功返回 true
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @dev 返回 spender 被 owner 授权可以花费的代币数量
     * @param owner 代币拥有者地址
     * @param spender 被授权花费代币的地址
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev 授权 spender 可以使用调用者的代币，数量为 amount
     * @param spender 被授权花费代币的地址
     * @param amount 授权的代币数量
     * @return 如果授权成功返回 true
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev 从 from 地址转移 amount 数量的代币到 to 地址
     * 调用者必须有足够的授权额度
     * @param from 代币来源地址
     * @param to 接收代币的地址
     * @param amount 要转移的代币数量
     * @return 如果转移成功返回 true
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    /**
     * @dev 当代币被转移时触发
     * @param from 代币来源地址
     * @param to 接收代币的地址
     * @param value 转移的代币数量
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev 当授权额度被设置时触发
     * @param owner 代币拥有者地址
     * @param spender 被授权花费代币的地址
     * @param value 授权的代币数量
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

