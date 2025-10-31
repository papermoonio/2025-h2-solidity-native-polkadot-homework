// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ERC20 Token Standard Interface
 * @dev Standard interface for ERC20 tokens as defined in EIP-20
 * @notice 所有符合 ERC20 标准的代币必须实现此接口
 */
interface IERC20 {
    /**
     * @dev 当代币从一个地址转移到另一个地址时触发
     * @param from 发送者地址（mint 时为 address(0)）
     * @param to 接收者地址（burn 时为 address(0)）
     * @param value 转移的代币数量
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev 当 owner 授权 spender 使用代币时触发
     * @param owner 代币所有者地址
     * @param spender 被授权的地址
     * @param value 授权的代币数量
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev 返回代币的总供应量
     * @return 代币的总供应量（最小单位）
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev 返回指定账户的代币余额
     * @param account 要查询的账户地址
     * @return 账户的代币余额
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev 将指定数量的代币从调用者地址转移到 recipient
     * @param recipient 接收者地址
     * @param amount 要转移的代币数量
     * @return 操作是否成功
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev 返回 spender 被授权从 owner 账户中花费的代币数量
     * @param owner 代币所有者地址
     * @param spender 被授权的地址
     * @return 剩余授权数量
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev 授权 spender 可以从调用者账户中花费最多 amount 的代币
     * @param spender 被授权的地址
     * @param amount 授权的代币数量
     * @return 操作是否成功
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev 从 sender 账户转移 amount 代币到 recipient
     * @dev 调用者必须有足够的授权额度
     * @param sender 代币来源地址
     * @param recipient 接收者地址
     * @param amount 要转移的代币数量
     * @return 操作是否成功
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}
