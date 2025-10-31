// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title IERC20 接口
/// @notice ERC-20 代币标准的最小接口定义，包含事件与常用函数签名
interface IERC20 {
    /// @notice 返回代币的总供应量
    /// @return uint256 总供应量（单位为代币的最小单位）
    function totalSupply() external view returns (uint256);

    /// @notice 返回指定地址的代币余额
    /// @param account 查询余额的地址
    /// @return uint256 该地址的代币余额
    function balanceOf(address account) external view returns (uint256);

    /// @notice 将一定数量的代币从调用者地址发送到 recipient
    /// @param recipient 接收者地址
    /// @param amount 发送的代币数量（最小单位）
    /// @return bool 表示操作是否成功
    function transfer(address recipient, uint256 amount) external returns (bool);

    /// @notice 批准 spender 可以代表调用者花费最多 amount 的代币
    /// @param spender 被授权花费代币的地址
    /// @param amount 授权数量（最小单位）
    /// @return bool 表示操作是否成功
    function approve(address spender, uint256 amount) external returns (bool);

    /// @notice 从 sender 转移代币到 recipient，调用者需被授权有足够 allowance
    /// @param sender 代币来源地址
    /// @param recipient 代币接收地址
    /// @param amount 转移的代币数量（最小单位）
    /// @return bool 表示操作是否成功
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    /// @notice 查询 owner 授权给 spender 的剩余可用代币数量
    /// @param owner 授权者地址
    /// @param spender 被授权者地址
    /// @return uint256 剩余可用数量
    function allowance(address owner, address spender) external view returns (uint256);

    /// @notice 在代币转移时触发，用于索引转账记录
    /// @param from 发送者地址（若为 mint，通常为 0 地址）
    /// @param to 接收者地址（若为 burn，通常为 0 地址）
    /// @param value 转移数量
    event Transfer(address indexed from, address indexed to, uint256 value);

    /// @notice 在调用 approve 时触发，用于索引授权记录
    /// @param owner 授权者地址
    /// @param spender 被授权者地址
    /// @param value 授权数量
    event Approval(address indexed owner, address indexed spender, uint256 value);
}