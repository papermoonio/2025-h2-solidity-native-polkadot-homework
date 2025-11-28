# Solidity Reentrancy Vulnerability Demonstration

This project demonstrates a **reentrancy vulnerability** in Solidity smart contracts using Hardhat 3 with ethers.js v6.

> 中文说明：
>
> 本项目演示了 Solidity 合约中的“重入（reentrancy）”漏洞及其利用方式。通过示例合约 `VulnerableBank.sol`（含漏洞）和 `ReentrancyAttacker.sol`（利用合约），配合测试用例演示攻击过程、观测 `receive()` 被触发、以及如何分块提取（例如 1 ETH × 多次）来窃取合约资金。建议在生产合约中使用 Checks-Effects-Interactions 模式或 OpenZeppelin 的 `ReentrancyGuard` 进行防护。

## Project Overview

The project includes:
- **VulnerableBank.sol** - A simple contract with a classic reentrancy vulnerability
- **ReentrancyAttacker.sol** - An attacker contract that exploits the vulnerability
- **Comprehensive test suite** - Multiple test files demonstrating the vulnerability at different levels

## The Vulnerability

The reentrancy vulnerability occurs when a smart contract sends ETH to another address before updating its internal state. This allows the recipient contract to call back into the original contract and make additional withdrawals.

### Vulnerable Code Pattern

```solidity
function withdraw(uint amount) public {
		require(balances[msg.sender] >= amount, "Insufficient balance");
    
		// ⚠️ VULNERABLE: State not updated before external call!
		(bool success, ) = msg.sender.call{value: amount}("");
		require(success, "Transfer failed");
    
		// This happens AFTER the call completes
		balances[msg.sender] -= amount;
}
```

### The Attack

1. Attacker deposits 1 ETH → `balances[attacker] = 1`
2. Attacker calls `withdraw(1)`
3. Contract sends 1 ETH → triggers `receive()` in attacker contract
4. **At this point: `balances[attacker]` is STILL 1 (not updated yet!)**
5. Attacker can call `withdraw()` again with the stale balance
6. Only after all nested calls complete does `balances[attacker] -= 1` execute

# 重入（Reentrancy）漏洞示例说明（中文）

该仓库演示了 Solidity 合约中常见的重入漏洞（Reentrancy），通过示例合约与攻击合约配合测试，展示漏洞原因、攻击过程与修复方式。适合作为安全教学或实验演示用例。

## 项目包含

- `contracts/VulnerableBank.sol`：存在重入漏洞的示例合约。
- `contracts/ReentrancyAttacker.sol`：利用该漏洞的攻击合约（包含分块提取演示）。
- `test/`：三套 TypeScript 测试：`Reentrancy.ts`（主演示）、`DetailedReentrancy.ts`（逐步分析）、`DebugReentrancy.ts`（调试）。

## 漏洞原理（简明）

重入漏洞通常发生在合约在向外部地址发送 ETH（或调用外部合约）之前没有先更新内部状态（例如余额映射）。当接收方是合约时，它的 `receive()` 或 `fallback()` 会在接收到 ETH 时立即执行，攻击合约可以在回调中再次调用原合约的敏感函数（如 `withdraw`），在原合约尚未更新状态前多次提取资金。

典型的易受攻击写法如下：

```solidity
function withdraw(uint amount) public {
	require(balances[msg.sender] >= amount, "Insufficient balance");

	// ❌ 漏洞：在外部调用前未更新状态
	(bool success, ) = msg.sender.call{value: amount}("");
	require(success, "Transfer failed");

	// 此处才更新状态，给了回调重入的机会
	balances[msg.sender] -= amount;
}
```

攻击者利用该顺序的关键点是：当执行 `call{value: amount}` 时，被调用合约的 `receive()` 会被触发，而原合约尚未减少 `balances[msg.sender]`，攻击合约可以在 `receive()` 中再次调用 `withdraw()`，重复提取。

## 攻击流程（示例）

1. 攻击合约向 `VulnerableBank` 存入资金（例如 5 ETH），此时 `balances[attacker] = 5`。
2. 攻击合约调用 `withdraw(1 ETH)`（首次提取一个固定块），触发 `VulnerableBank` 发送 1 ETH。
3. 在发送过程中，攻击合约的 `receive()` 被调用，`receive()` 再次读取 `balances[attacker]`（仍为 5），并调用 `withdraw(1 ETH)`。
4. 嵌套调用循环执行，攻击合约每次在 `receive()` 中再次提取 1 ETH，直到记录余额不足或调用失败为止。

在本仓库中，演示使用了“分块提取（1 ETH 单位）”的方式来演示如何连续多次提取（例如 5 次提取共 5 ETH），同时避免 Solidity 0.8 的算术检查导致的下溢错误。

## 如何运行测试

运行全部测试：

```bash
yarn test
```

运行单个示例：

```bash
yarn test test/Reentrancy.ts
yarn test test/DetailedReentrancy.ts
yarn test test/DebugReentrancy.ts
```

测试输出会显示攻击合约收到的 ETH 数量、`receive()` 被调用的次数、是否存在嵌套提现失败等调试信息。

## 演示要点（测试中观察到的行为）

- `receive()` 被触发（`reentryCount >= 1`）。
- 攻击合约在 `receive()` 中尝试多次调用 `withdraw(1 ETH)`，最终可收到多次 1 ETH（例如合计 5 ETH）。
- 这些行为证明了在外部调用之前未更新状态会带来重入风险。

## 修复建议

防止重入的常见做法：

1. 使用 Checks-Effects-Interactions 模式（先检查、再更新状态、最后与外部交互）：

```solidity
function withdraw(uint amount) public {
	require(balances[msg.sender] >= amount, "Insufficient balance");
  
	// ✅ 先更新合约内状态
	balances[msg.sender] -= amount;

	// 然后执行外部调用
	(bool success, ) = msg.sender.call{value: amount}("");
	require(success, "Transfer failed");
}
```

2. 使用成熟的库（如 OpenZeppelin 的 `ReentrancyGuard`）给敏感函数加互斥锁：

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SafeBank is ReentrancyGuard {
	mapping(address => uint) public balances;

	function withdraw(uint amount) public nonReentrant {
		require(balances[msg.sender] >= amount);
		balances[msg.sender] -= amount;
		(bool success, ) = msg.sender.call{value: amount}("");
		require(success);
	}
}
```

## 项目结构

```
contracts/
	├── VulnerableBank.sol       # 漏洞合约
	├── ReentrancyAttacker.sol   # 攻击合约（分块提取演示）
	└── Counter.sol              # 示例合约

test/
	├── Reentrancy.ts            # 主演示（分块提取示例）
	├── DetailedReentrancy.ts    # 逐步分析与调试信息
	├── DebugReentrancy.ts       # 快速调试
	└── Counter.ts               # 示例合约的测试
```

## 进一步工作建议

- 我可以在仓库中添加一个“已修复”的合约（例如 `SafeBank.sol`）并写对比测试，展示修复前后的行为差异。
- 或者把攻击合约拆成 `ReentrancyAttackerSimple.sol` 与 `ReentrancyAttackerChunked.sol` 两个示例，便于教学演示不同策略。


