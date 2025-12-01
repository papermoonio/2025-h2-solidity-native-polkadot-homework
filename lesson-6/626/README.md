# 存储布局不匹配漏洞

本目录包含一个演示使用 `delegatecall` 时因存储布局不匹配导致的安全漏洞示例。

## 漏洞解释

在 Solidity 中，`delegatecall` 在调用合约（Proxy）的上下文中执行目标合约（Logic）的代码。这意味着：
1. `msg.sender` 和 `msg.value` 保持不变。
2. 使用的是 Proxy 合约的 **存储（Storage）**。

如果 Proxy 和 Logic 合约没有完全相同的存储布局，Logic 合约可能会写入对应于 Proxy 合约中不同变量的存储槽（Slot）。

## 环境设置

### 1. 代理合约 (`Proxy.sol`)
Proxy 合约定义的存储如下：
- Slot 0: `address public lib` (Logic 合约地址)
- Slot 1: `address public owner` (我们要保护的敏感变量)
- Slot 2: `uint256 public number`

### 2. 逻辑合约 (`Logic.sol`)
Logic 合约定义的存储如下：
- Slot 0: `address public lib`
- Slot 1: `uint256 public number` (**不匹配！**)
- Slot 2: `address public owner`

### 冲突点
当 `Logic` 写入 `number` 时，它实际上是写入 **Slot 1**。
在 `Proxy` 中，**Slot 1** 存储的是 `owner`。

因此，如果我们调用 Proxy 上的 `setNumber()`（通过 delegatecall 转发给 Logic），它将覆盖 Proxy 中的 `owner` 变量。

## 攻击方式

我们有一个 `Attacker.sol` 合约。
它调用 Proxy 的 `execute()`，传入数据以调用 `setNumber(uint256)`。
它将自己的地址（转换为 uint256）作为参数传入。

攻击流程如下：
1. `Attacker` 调用 `Proxy.execute(setNumber(attackerAddress))`。
2. `Proxy` 执行 `delegatecall Logic.setNumber(attackerAddress)`。
3. `Logic` 将 `attackerAddress` 写入 **Slot 1**。
4. `Proxy` 的 **Slot 1** 被更新。`Proxy.owner` 变成了 `Attacker` 的地址。

## 如何复现 (Remix)

1. 打开 [Remix IDE](https://remix.ethereum.org/).
2. 创建文件 `Logic.sol`、`Proxy.sol` 和 `Attacker.sol` 并填入相应代码。
3. 编译所有合约。
4. **部署 Logic**:
   - 部署 `Logic` 合约。复制它的地址。
5. **部署 Proxy**:
   - 部署 `Proxy` 合约，在构造函数中传入 `Logic` 的地址。
   - 检查 `owner`：它应该是你的账户地址。
   - 检查 `lib`：它应该是 Logic 的地址。
6. **部署 Attacker**:
   - 部署 `Attacker` 合约。
7. **执行攻击**:
   - 调用 `Attacker.attack(proxyAddress)`。
8. **验证**:
   - 回到 `Proxy` 实例。
   - 检查 `owner`。它现在应该变成了 `Attacker` 合约的地址！
   - 漏洞复现成功。
