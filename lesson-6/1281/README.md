# 以太坊智能合约重入攻击演示

## 📖 概述

本项目演示了以太坊智能合约中最著名的安全漏洞之一：**重入攻击（Reentrancy Attack）**。

## 🔍 什么是重入攻击？

重入攻击发生在合约 A 调用合约 B 时，合约 B 可以在 A 完成执行之前重新进入（"重入"）合约 A。

### 漏洞代码示例

```solidity
// ⚠️ 有漏洞的代码
function withdraw(uint256 _amount) public {
    require(balances[msg.sender] >= _amount);  // 1. 检查
    msg.sender.call{value: _amount}("");       // 2. 发送 ETH（外部调用）
    balances[msg.sender] -= _amount;           // 3. 更新余额（太晚了！）
}
```

### 攻击原理

```
攻击者调用 withdraw(1 ETH)
    ↓
检查余额: 1 ETH ≥ 1 ETH ✓
    ↓
发送 1 ETH 给攻击者 → 触发攻击者的 receive()
    │
    └──→ receive() 再次调用 withdraw(1 ETH)
              ↓
         检查余额: 1 ETH ≥ 1 ETH ✓ (还没更新!)
              ↓
         发送 1 ETH 给攻击者 → 触发 receive()
              │
              └──→ 继续循环直到银行余额耗尽...
```

## 📁 项目结构

```
├── contracts/
│   ├── VulnerableBank.sol   # 有重入漏洞的银行合约
│   ├── Attacker.sol         # 攻击者合约
│   └── SecureBank.sol       # 修复后的安全合约
├── test/
│   └── ReentrancyAttack.test.js  # 测试用例
├── hardhat.config.js
├── package.json
└── README.md
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 编译合约

```bash
npm run compile
```

### 3. 运行测试

```bash
npm test
```

## 🛡️ 防护方案

### 方案 1: Checks-Effects-Interactions (CEI) 模式

```solidity
function withdraw(uint256 _amount) public {
    require(balances[msg.sender] >= _amount);  // Checks
    balances[msg.sender] -= _amount;           // Effects（先更新状态！）
    msg.sender.call{value: _amount}("");       // Interactions
}
```

### 方案 2: ReentrancyGuard

```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SecureBank is ReentrancyGuard {
    function withdraw(uint256 _amount) public nonReentrant {
        // 即使顺序不对，nonReentrant 也能保护
    }
}
```

### 方案 3: 使用 transfer() 限制 Gas

```solidity
function withdraw(uint256 _amount) public {
    require(balances[msg.sender] >= _amount);
    balances[msg.sender] -= _amount;
    payable(msg.sender).transfer(_amount);  // 只转发 2300 gas
}
```

## 📊 测试结果示例

```
重入攻击演示 (Reentrancy Attack Demo)
  🚨 漏洞利用测试
    ============================================================
    💰 准备阶段：受害者存款
    ============================================================
    Victim1 存入: 10 ETH
    Victim2 存入: 5 ETH
    银行总余额: 15.0 ETH
    
    ============================================================
    🚨 发起重入攻击！（投入 1 ETH）
    ============================================================
    
    ============================================================
    💀 攻击后状态
    ============================================================
    银行余额: 0.0 ETH
    攻击合约余额: 16.0 ETH
    重入次数: 16 次
    
    🤑 攻击者获利: 15.0 ETH
    📊 投入产出比: 1 ETH → 16.0 ETH
```
