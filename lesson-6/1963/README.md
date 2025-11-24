# Smart Contract Vulnerabilities Demo

本项目演示了三种常见的智能合约漏洞及其攻击方式。This project demonstrates three common smart contract vulnerabilities and their attack methods.

## 项目概述 / Project Overview

本项目使用 Foundry 框架实现了三个漏洞示例：
- **重入攻击 (Reentrancy Attack)**
- **委托调用存储冲突 (Delegatecall Storage Collision)**
- **可预测随机数 (Predictable Randomness)**

This project uses the Foundry framework to demonstrate three vulnerability examples:
- **Reentrancy Attack**
- **Delegatecall Storage Collision**
- **Predictable Randomness**

## 漏洞详解 / Vulnerability Details

### 1. 重入攻击 (Reentrancy Attack)

#### 漏洞合约 / Vulnerable Contract
`contracts/ReentrancyVault.sol` - 一个存在重入漏洞的资金库合约

**漏洞原因：**
- `withdraw()` 函数在执行外部调用（`msg.sender.call`）**之前**没有更新状态（`balances[msg.sender] = 0`）
- 这违反了 **CEI 模式**（Checks-Effects-Interactions）：应该先更新状态，再进行外部调用

**Vulnerability:**
- The `withdraw()` function makes an external call (`msg.sender.call`) **before** updating the state (`balances[msg.sender] = 0`)
- This violates the **CEI pattern** (Checks-Effects-Interactions): state should be updated before external calls

```solidity
function withdraw() external {
    uint256 bal = balances[msg.sender];
    require(bal > 0, "no funds");
    // ❌ 外部调用在前 (VULNERABLE)
    (bool ok, ) = msg.sender.call{value: bal}("");
    require(ok, "send failed");
    // ✅ 状态更新在后 (应该在前)
    balances[msg.sender] = 0;
}
```

#### 攻击合约 / Attack Contract
`contracts/ReentrancyAttacker.sol` - 利用重入漏洞的攻击合约

**攻击方式：**
1. 攻击者先向 `ReentrancyVault` 存入 1 ETH
2. 调用 `withdraw()` 提取资金
3. 当合约向攻击者合约发送 ETH 时，触发 `receive()` 函数
4. `receive()` 函数再次调用 `withdraw()`，此时 `balances[msg.sender]` 还未被清零
5. 重复步骤 3-4，直到资金库被掏空

**Attack Method:**
1. Attacker deposits 1 ETH into `ReentrancyVault`
2. Calls `withdraw()` to withdraw funds
3. When the contract sends ETH to the attacker contract, it triggers the `receive()` function
4. `receive()` calls `withdraw()` again, while `balances[msg.sender]` hasn't been zeroed yet
5. Repeat steps 3-4 until the vault is drained

#### 运行测试 / Run Tests
```bash
forge test --match-path test/Reentrancy.t.sol -vv
```

#### 运行脚本 / Run Script
```bash
# 启动 anvil
anvil

# 在另一个终端运行脚本
forge script script/deploy_and_attack.s.sol --rpc-url http://localhost:8545 --private-key <your_private_key> --broadcast -vvvv
```

---

### 2. 委托调用存储冲突 (Delegatecall Storage Collision)

#### 漏洞合约 / Vulnerable Contract
`contracts/BadProxy.sol` - 一个存在存储冲突漏洞的代理合约

**漏洞原因：**
- 代理合约使用 `delegatecall` 将调用转发给实现合约
- `delegatecall` 会在**代理合约的存储上下文**中执行实现合约的代码
- 如果实现合约的存储布局与代理合约不一致，会导致存储槽被意外覆盖

**Vulnerability:**
- The proxy contract uses `delegatecall` to forward calls to the implementation contract
- `delegatecall` executes implementation code in the **proxy contract's storage context**
- If the implementation's storage layout doesn't match the proxy's, storage slots can be accidentally overwritten

```solidity
fallback() external payable {
    // delegatecall 在代理合约的存储中执行实现合约代码
    (bool ok, ) = implementation.delegatecall(msg.data);
    require(ok, "delegatecall failed");
}
```

#### 攻击合约 / Attack Contract
`contracts/MaliciousImpl.sol` - 恶意实现合约

**攻击方式：**
1. 恶意实现合约的 `takeover()` 函数使用内联汇编直接写入存储槽 0
2. 存储槽 0 在代理合约中对应 `owner` 变量
3. 通过代理合约调用 `takeover()`，恶意代码在代理合约的存储上下文中执行
4. 攻击者成功覆盖代理合约的 `owner`，获得控制权

**Attack Method:**
1. The malicious implementation's `takeover()` function uses inline assembly to directly write to storage slot 0
2. Storage slot 0 in the proxy corresponds to the `owner` variable
3. Calling `takeover()` through the proxy executes malicious code in the proxy's storage context
4. Attacker successfully overwrites the proxy's `owner` and gains control

```solidity
function takeover() external {
    // 直接写入存储槽 0 (代理合约的 owner)
    assembly {
        sstore(0, caller())
    }
}
```

#### 运行测试 / Run Tests
```bash
forge test --match-path test/Delegatecall.t.sol -vv
```

---

### 3. 可预测随机数 (Predictable Randomness)

#### 漏洞合约 / Vulnerable Contract
`contracts/RandomGame.sol` - 一个使用可预测随机数的游戏合约

**漏洞原因：**
- 使用 `block.timestamp` 和 `block.difficulty`（已废弃）生成随机数
- 这些值在交易执行时是公开的，攻击者可以在同一区块内预测结果
- `block.difficulty` 在 Paris 升级后已被 `prevrandao` 取代，但在测试环境中仍可预测

**Vulnerability:**
- Uses `block.timestamp` and `block.difficulty` (deprecated) to generate randomness
- These values are public when the transaction executes, allowing attackers to predict results within the same block
- `block.difficulty` was replaced by `prevrandao` after the Paris upgrade, but is still predictable in test environments

```solidity
function pickWinner() external {
    require(msg.sender == owner, "only owner");
    // ❌ 可预测的伪随机数
    uint256 rand = uint256(keccak256(abi.encodePacked(
        block.timestamp, 
        block.difficulty, 
        players.length
    )));
    address winner = players[rand % players.length];
    payable(winner).transfer(address(this).balance);
    delete players;
}
```

#### 攻击方式 / Attack Method
攻击者可以：
1. 在调用 `pickWinner()` 之前，使用相同的公式计算随机数
2. 预测获胜者
3. 如果预测到自己会输，可以选择不参与或等待下一个区块

**Attacker can:**
1. Calculate the random number using the same formula before `pickWinner()` is called
2. Predict the winner
3. Choose not to participate or wait for the next block if they predict they'll lose

#### 运行测试 / Run Tests
```bash
forge test --match-path test/Random.t.sol -vv
```

---

## 项目结构 / Project Structure

```
AL-vuln/
├── contracts/              # 漏洞合约和攻击合约
│   ├── ReentrancyVault.sol
│   ├── ReentrancyAttacker.sol
│   ├── BadProxy.sol
│   ├── MaliciousImpl.sol
│   ├── RandomGame.sol
│   └── RandomAttacker.sol
├── test/                  # 测试文件
│   ├── Reentrancy.t.sol
│   ├── Delegatecall.t.sol
│   └── Random.t.sol
├── script/                # 部署脚本
│   └── deploy_and_attack.s.sol
└── README.md
```

## 使用方法 / Usage

### 安装依赖 / Install Dependencies
```bash
forge install
```

### 编译 / Build
```bash
forge build
```

### 运行所有测试 / Run All Tests
```bash
forge test -vv
```

### 运行特定测试 / Run Specific Test
```bash
# 重入攻击测试
forge test --match-path test/Reentrancy.t.sol -vv

# 委托调用测试
forge test --match-path test/Delegatecall.t.sol -vv

# 随机数测试
forge test --match-path test/Random.t.sol -vv
```

### 格式化代码 / Format Code
```bash
forge fmt
```

## 防护措施 / Mitigation

### 重入攻击防护
- 遵循 **CEI 模式**：先检查（Checks），再更新状态（Effects），最后进行外部调用（Interactions）
- 使用重入锁（ReentrancyGuard）
- 使用 `transfer()` 或 `send()` 代替 `call()`（限制 gas）

### 委托调用防护
- 确保代理合约和实现合约的存储布局完全一致
- 使用存储槽命名约定（如 EIP-1967）
- 仔细审查所有通过 `delegatecall` 执行的代码

### 随机数防护
- 使用链下随机数生成器（如 Chainlink VRF）
- 使用承诺-揭示方案（Commit-Reveal Scheme）
- 避免使用 `block.timestamp`、`block.difficulty` 等可预测值

## 参考资料 / References

- [Foundry Documentation](https://book.getfoundry.sh/)
- [SWC-107: Reentrancy](https://swcregistry.io/docs/SWC-107)
- [SWC-112: Delegatecall to Untrusted Callee](https://swcregistry.io/docs/SWC-112)
- [SWC-120: Weak Sources of Randomness](https://swcregistry.io/docs/SWC-120)

## 许可证 / License

MIT
