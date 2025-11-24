# EVM vs PolkaVM: 账户配置对比

## 实测结果

### EVM 模式（标准 Hardhat）

运行 `node check-accounts.js`：

```
=== Checking Available Accounts ===

Network: hardhat
PolkaVM mode: NO

Total accounts available: 20

Account #0:
  Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  Balance: 10000.0 ETH

Account #1:
  Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  Balance: 10000.0 ETH

Account #2:
  Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  Balance: 10000.0 ETH

... and 17 more accounts

=== Testing [wallet, other] = await ethers.getSigners() ===

wallet: ✅ EXISTS
other: ✅ EXISTS

✅ Second account is available - tests will pass!
```

### PolkaVM 模式

从测试日志中看到的实际行为：

```javascript
// 测试代码
[wallet, other] = await ethers.getSigners();

// 结果
wallet = ✅ Dev 账户 (有资金)
other = ❌ undefined

// 错误
TypeError: Cannot read properties of undefined (reading 'getAddress')
    at Context.<anonymous> (test/UniswapV2Factory.js:110:36)
```

---

## 为什么会有差异？

### EVM 模式的工作原理

Hardhat 内置 **HDWalletProvider**，自动生成 20 个账户：

```javascript
// Hardhat 默认配置（你看不到，但它在后台做了）
const DEFAULT_MNEMONIC = "test test test test test test test test test test test junk";

// 从这个助记词派生 20 个账户
// 账户 #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
// 账户 #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
// ... (总共 20 个)

// 每个账户预存 10,000 ETH
```

**配置文件**：
```javascript
// hardhat.config.js
networks: {
  hardhat: {}  // 空配置，Hardhat 自动提供 20 个账户
}
```

**获取账户**：
```javascript
const signers = await ethers.getSigners();
console.log(signers.length);  // 输出: 20
```

### PolkaVM 模式的工作原理

Substrate 开发节点使用 `--dev` 标志启动，只提供 **Alice** 开发账户：

```bash
# 启动命令
substrate-node --dev --rpc-port 8000

# 提供的账户：
# Alice (SS58): 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
# 通过 ETH-RPC 适配器映射到 EVM 地址
```

**配置文件**：
```javascript
// hardhat.config.js
networks: {
  hardhat: {
    polkavm: true,
    nodeConfig: {
      nodeBinaryPath: "../revive-dev-node-darwin-arm64",
      dev: true,  // ⚠️ dev 模式只提供 1 个账户
    }
    // ⚠️ 没有 accounts 数组 = 依赖节点提供的账户
  }
}
```

**获取账户**：
```javascript
const signers = await ethers.getSigners();
console.log(signers.length);  // 输出: 1 (只有 Alice)
```

---

## 为什么不在配置中添加更多账户？

你可能会问：为什么不像 EVM 一样，在 `hardhat.config.js` 中添加多个私钥？

```javascript
// 理论上可以这样做
networks: {
  hardhat: {
    polkavm: true,
    accounts: [
      "0x私钥1",
      "0x私钥2",  // ❓ 但这有用吗？
    ],
    // ...
  }
}
```

### 问题：账户需要在链上有资金

**EVM 模式**：
- Hardhat **控制整个区块链**
- 可以随意给任何地址充值
- 账户不需要提前存在

**PolkaVM 模式**：
- 连接到**外部** Substrate 节点
- 节点控制账户和余额
- 配置文件中的私钥对应的地址**必须在链上有资金**

### 实际情况

```javascript
// 在配置中添加第二个私钥
accounts: [
  "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133",  // ✅ Dev 账户
  "0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b",  // ❌ 链上没钱
]

// 测试时
const [wallet, other] = await ethers.getSigners();
console.log(await wallet.getBalance());  // 10000 ETH ✅
console.log(await other.getBalance());   // 0 ETH ❌

// other 发送交易会失败（余额不足）
await other.sendTransaction({ ... });  // Error: insufficient funds
```

---

## 对比总结

| 特性 | EVM 模式 | PolkaVM 模式 |
|-----|---------|-------------|
| **默认账户数** | 20 | 1 |
| **每账户余额** | 10,000 ETH | Alice 有预存资金 |
| **账户来源** | Hardhat 内部生成 | Substrate 节点提供 |
| **配置方式** | 自动，无需配置 | 依赖节点配置 |
| **添加账户** | 自动包含 20 个 | 需要手动创建并充值 |
| **测试友好度** | ✅ 开箱即用 | ⚠️ 需要额外配置 |
| **生产环境** | N/A (仅测试用) | ✅ 更接近真实链 |

## 测试代码的假设

所有测试文件都假设**至少有 2 个账户**：

```javascript
// test/UniswapV2Factory.js
beforeEach(async function () {
  [wallet, other] = await ethers.getSigners();  // 假设有 other
  
  // 后续使用 other
  await other.sendTransaction(...);  // EVM ✅  PolkaVM ❌
});
```

**在 EVM 模式下**：
- `wallet` = Account #0 ✅
- `other` = Account #1 ✅
- 测试正常运行

**在 PolkaVM 模式下**：
- `wallet` = Alice ✅
- `other` = undefined ❌
- `other.sendTransaction()` → TypeError

---

## 真实场景类比

### EVM 模式 = 游乐场

```
你进入一个游乐场：
✅ 门口给你 20 个代币
✅ 每个代币价值 10,000 元
✅ 立即可以玩所有游戏
✅ 不需要任何准备
```

### PolkaVM 模式 = 真实区块链

```
你连接到一个区块链网络：
⚠️ 默认只有你的钱包（1个账户）
⚠️ 其他地址需要你创建
⚠️ 新账户需要你转账充值
✅ 更接近真实使用场景
```

---

## 解决方案

### 方案 1: 在测试中动态创建账户 ✅ 推荐

```javascript
beforeEach(async function () {
  const signers = await ethers.getSigners();
  wallet = signers[0];
  
  // 创建新账户
  const randomWallet = ethers.Wallet.createRandom();
  other = randomWallet.connect(ethers.provider);
  
  // 从 wallet 给 other 转账
  await wallet.sendTransaction({
    to: other.address,
    value: ethers.parseEther('100')
  });
  
  // 现在 other 有资金了！
  console.log(await other.getBalance());  // 100 ETH ✅
});
```

### 方案 2: 配置多个预置账户 (需要节点支持)

```javascript
// hardhat.config.js
networks: {
  hardhat: {
    polkavm: true,
    accounts: [
      "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133",
      "0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b",
    ],
    // ...
  }
}
```

然后在节点启动时给第二个账户充值：
```bash
# 需要修改节点配置或使用创世区块配置
# 给多个账户预存资金
```

### 方案 3: 跳过需要多账户的测试

```javascript
before(async function() {
  if (hre.network.config.polkavm) {
    const signers = await ethers.getSigners();
    if (signers.length < 2) {
      console.log("⚠️  Skipping multi-account tests in PolkaVM mode");
      this.skip();
    }
  }
});
```

---

## 结论

### EVM 需要第二个账号吗？

**是的！测试代码确实需要第二个账号。**

### 区别在哪里？

**EVM 自动提供了 20 个账号**，所以：
- ✅ 你不需要手动配置
- ✅ 测试可以直接运行
- ✅ 看起来"不需要"第二个账号

**PolkaVM 只提供了 1 个账号**，所以：
- ❌ 测试获取不到第二个账号
- ❌ `other` 变量是 undefined
- ❌ 相关测试失败

### 核心要点

```
失败不是因为 PolkaVM 不支持多账户操作
失败是因为 PolkaVM 开发环境默认只提供 1 个账户
这是测试环境配置差异，不是功能差异
```

**证据**：所有单账户的 DeFi 操作（流动性、交易、价格计算）都在 PolkaVM 上完美运行！

---

## 快速验证脚本

运行 `check-accounts.js` 查看差异：

```bash
# EVM 模式
node check-accounts.js
# 输出: 20 accounts

# PolkaVM 模式 (需要先启动节点)
POLKA_NODE=true node check-accounts.js
# 输出: 1 account
```
