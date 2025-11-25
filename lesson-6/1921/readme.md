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
