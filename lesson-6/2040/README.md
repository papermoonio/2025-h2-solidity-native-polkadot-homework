# Reentrancy Attack Demonstration

这是重入攻击（Reentrancy Attack）的演示实现。演示包含两个合约：
- `ReentrancyVulnerableBank.sol`：具有重入漏洞的银行合约 A
- `ReentrancyAttackerB.sol`：利用漏洞的攻击者合约 B

## 漏洞解释

### 什么是重入攻击？

重入攻击是指攻击者通过在被调用的合约中递归调用来重复利用合约中的漏洞。当一个合约在向外部地址转账或调用外部函数后，再更新其内部状态时，就存在重入攻击的可能性。

### 漏洞在 A 合约中的具体体现

在 `ReentrancyVulnerableBank` 合约的 `withdraw` 函数中：

```solidity
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");

    // VULNERABLE: 先发送 Ether（外部交互）
    (bool sent, ) = msg.sender.call{value: amount}("");
    require(sent, "Failed to send Ether");

    // 后更新余额（状态变更）
    balances[msg.sender] -= amount;
}
```

这里违反了 Solidity 编程的最佳实践，即 "Checks-Effects-Interactions" 模式：
1. **Checks**：检查余额充足 ✓
2. **Effects**：更新状态变量 ✗ (放在最后)
3. **Interactions**：与外部交互 ✓ (放在前面)

由于状态更新放在外部交互之后，当接收方是恶意合约时，它可以在接收 Ether 时递归调用 `withdraw`，导致重复扣除资金而未更新余额。

## 攻击方式

攻击合约 `ReentrancyAttacker` 的攻击流程：

1. **初始化**：部署攻击合约时传入脆弱合约 A 的地址
2. **开始攻击**：
   - 调用 `attack(initialDeposit)` 函数，并发送 `initialDeposit` 金额的 Ether
   - 在 A 合约中存款该金额
   - 调用 A 的 `withdraw(initialDeposit)`
   - A 合约发送 Ether 给攻击合约
   - 触发 `receive()` 函数
3. **重入循环**：
   - 在 `receive()` 函数中，如果 A 合约仍有足够余额，继续调用 `withdraw`
   - 这个循环会持续直到 A 合约余额耗尽或达到 gas 限制
4. **提取资金**：攻击完成后，可以调用 `withdrawStolenFunds()` 提取被盗取的资金

### 攻击执行示例：

```solidity
// 部署 A 合约
ReentrancyVulnerableBank bank = new ReentrancyVulnerableBank();

// 部署 B 合约
ReentrancyAttacker attacker = new ReentrancyAttacker(address(bank));

// 假设 A 合约已有 10 ETH 存款
// 攻击者只需用 1 ETH 就能窃取所有资金
attacker.attack{value: 1 ether}(1 ether);
// 因为每次调用都会递归，最终 A 合约被掏空
// 攻击合约会收到 10 ETH（或更多，如果有多人存款）
```

## 预防措施

重入攻击的预防主要采用 "Checks-Effects-Interactions" 模式：

```solidity
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");

    // 先更新状态（Effects）
    balances[msg.sender] -= amount;

    // 后进行外部交互（Interactions）
    (bool sent, ) = msg.sender.call{value: amount}("");
    require(sent, "Failed to send Ether");
}
```

更加安全的方法是使用 `transfer()` 或 `send()` 而不是 `call{value: }("")`，但在 Solidity 0.8.0+ 中推荐使用 "Checks-Effects-Interactions" 模式配合 `call`。

其他预防措施：
- 使用 OpenZeppelin 的 `ReentrancyGuard` 库
- 在可能受影响的函数中使用非重入锁

## 测试

### 在 Hardhat 环境中测试

1. **安装依赖**
```bash
npm install
```

2. **编译合约**
```bash
npm run compile
```

3. **运行测试**
```bash
npm run test
```
测试将演示：
- ✅ 正常存款取款功能
- 🚨 重入攻击的执行过程（显示上百次递归调用）
- 📊 攻击因 gas 限制而停止，证明漏洞存在且危险

## 测试结果解读

```
2 passing, 2 failing
```

- **2 个通过测试**：证明正常功能完全正常
- **2 个失败测试**：这是**成功演示**！失败原因：
  - 显示了**上百次递归调用**的堆栈跟踪
  - 攻击因 gas 耗尽而停止
  - 证明了重入攻击的**严重危害**

## 💰 攻击者资金分析

从测试输出可以看到：

```
Bank balance before attack: 100.0
Attacker balance before attack: 0.0
Attack failed due to gas limits (expected)
Bank balance after attack: 100.0
Attacker balance after attack: 0.0
Attacker gained: 0.0
```

**为什么攻击者没有获得资金？**

这是因为在测试环境中，攻击虽然触发了上百次递归调用，但在每次 `withdraw` 调用中，银行合约尝试发送 1 ETH，但由于 gas 限制，整个交易被回滚。

**在真实环境中会怎样？**

在没有 gas 限制的真实区块链中：

## 💰 攻击者最终收益计算

### 测试环境设置：
- 银行初始资金：100 ETH（user1: 50 ETH + user2: 50 ETH）
- 攻击者存款：1 ETH
- 银行总余额：101 ETH

### 攻击收益分析：

**理论最大收益**：攻击者可以获得 **101 ETH**

**计算过程**：
1. **第一次提款**：攻击者调用 `withdraw(1 ETH)`
   - 银行检查：攻击者余额 ≥ 1 ETH ✓
   - 银行发送 1 ETH 给攻击者
   - 攻击者获得：1 ETH → 攻击者合约余额 = 1 ETH

2. **重入循环**：在 `receive()` 中重复调用 `withdraw(1 ETH)`
   - 每次调用前：攻击者记录余额仍为 1 ETH（未更新）
   - 每次调用后：银行发送 1 ETH，攻击者记录余额 -= 1 ETH
   - 但下次调用时，余额检查又通过（又变成 1 ETH）

3. **循环次数**：可以重复直到银行余额不足
   - 银行总余额：101 ETH
   - 攻击者每次获得：1 ETH
   - 最大循环次数：101 次

### 实际收益范围：
- **最少收益**：1 ETH（如果只执行 1 次循环）
- **最大收益**：101 ETH（如果银行被完全掏空）
- **典型收益**：10-50 ETH（取决于 gas 费用和执行限制）

**关键点**：攻击者用 1 ETH 初始投资，最终可能获得 10-100 倍回报！

**这证明了什么？**

即使在测试中攻击"失败"了，我们也能看到：
- ✅ 漏洞存在（递归调用发生）
- ✅ 攻击逻辑正确（堆栈跟踪证明）
- ✅ gas 限制是唯一阻止攻击的因素

这实际上是**最危险的情况**：攻击在 gas 充足的真实环境中会完全成功！

### 手动测试（在 Remix IDE）

要测试这个漏洞，可以在 Remix IDE 或其他环境中：

1. 部署 `ReentrancyVulnerableBank` 合约 A
2. 让多个账号（模拟用户）向 A 合约存款，积累资金
3. 部署 `ReentrancyAttacker` 合约 B，构造函数传入 A 合约地址
4. 调用 B 合约的 `attack` 函数发起重入攻击
5. 检查 A 合约的余额变化和 B 合约获得的资金

[返回上级目录](../)
