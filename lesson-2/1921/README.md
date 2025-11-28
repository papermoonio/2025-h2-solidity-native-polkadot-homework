# Homework 2 - ERC20 Token Implementation

## 学号: 1921

## 项目概述

本项目使用 Hardhat 实现了一个完整的 ERC20 代币合约，不依赖任何外部库（如 OpenZeppelin）。

## 合约功能

KKToken 合约实现了以下 ERC20 标准功能：
- **基础属性**: name、symbol、decimals、totalSupply
- **余额查询**: balanceOf 映射
- **代币转账**: transfer 函数
- **授权机制**: approve 和 allowance 映射  
- **代理转账**: transferFrom 函数
- **事件发射**: Transfer 和 Approval 事件

## 技术栈

- **框架**: Hardhat 3 Beta
- **测试**: Node.js test runner + viem
- **语言**: Solidity ^0.8.28 + TypeScript

## 测试用例

项目包含全面的测试用例，覆盖所有 ERC20 接口：

### 测试场景
- ✅ **构造函数测试**: 验证 name/symbol/decimals/totalSupply 正确初始化
- ✅ **transfer 成功**: 验证代币正常转账和余额更新  
- ✅ **transfer 失败**: 验证零地址转账和余额不足的拒绝
- ✅ **transferFrom 成功**: 验证授权代理转账机制
- ✅ **授权机制**: 验证 approve/allowance 的工作流程

### 运行测试

```shell
npx hardhat test
```

### 测试结果

```
  KKToken
    ✔ 初始化 name/symbol/decimals/totalSupply 并把余额给部署者 (737ms)
    ✔ ERC20: moves tokens from one account to another  
    ✔ ERC20: transfer to the zero address
    ✔ ERC20: insufficient balance
    ✔ ERC20: transferFrom

  5 passing (1261ms)
```

## 学习心得

通过本次作业，学习了：
- Solidity ERC20 标准的完整实现
- Hardhat 3 Beta + viem 的测试框架  
- 智能合约的授权和代理转账机制
- 从零实现标准代币合约（不依赖 OpenZeppelin）
