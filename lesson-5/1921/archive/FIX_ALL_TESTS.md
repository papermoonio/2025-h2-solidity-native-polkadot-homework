# 如何让所有 28 个测试通过

## 问题根源

PolkaVM 开发节点只提供 **1 个账户**，但测试需要 **2 个账户**。

失败的 4 个测试：
1. UniswapV2ERC20 - beforeEach hook
2. UniswapV2Factory - setFeeTo
3. UniswapV2Factory - setFeeToSetter
4. UniswapV2Pair - feeTo:on

## 解决方案对比

### 方案 1：动态创建第二个账户 ✅ 推荐

**优点**：
- ✅ 不需要修改 hardhat.config.js
- ✅ 不需要修改节点配置
- ✅ 代码改动最小
- ✅ 适用于任何 PolkaVM 环境

**实现步骤**：

#### 步骤 1: 修改 test/UniswapV2Factory.js

```javascript
// 原代码 (line 34-37)
beforeEach(async function () {
  [wallet, other] = await ethers.getSigners();
  
  // ...
});

// ⬇️ 修改为：

beforeEach(async function () {
  const signers = await ethers.getSigners();
  wallet = signers[0];
  
  // 在 PolkaVM 模式下动态创建第二个账户
  if (hre.network.config.polkavm && signers.length < 2) {
    const randomWallet = ethers.Wallet.createRandom();
    other = randomWallet.connect(ethers.provider);
    
    // 从 wallet 转账给 other
    await wallet.sendTransaction({
      to: other.address,
      value: ethers.parseEther('100')
    });
    
    console.log('✅ Created second account:', other.address);
  } else {
    other = signers[1];
  }
  
  // ... 其余代码不变
});
```

#### 步骤 2: 修改 test/UniswapV2ERC20.js

```javascript
// 原代码 (line 29-45)
beforeEach(async function() {
  [wallet, other] = await ethers.getSigners();

  let value;
  if (hre.network.name === 'local') {
    value = ethers.parseEther('100')
  } else {
    value = ethers.parseEther('1')
  }

  // send balance to other
  let otherAddress = await other.getAddress();
  await wallet.sendTransaction({
    to: otherAddress,
    value: value
  });
});

// ⬇️ 修改为：

beforeEach(async function() {
  const signers = await ethers.getSigners();
  wallet = signers[0];
  
  // 在 PolkaVM 模式下动态创建第二个账户
  if (hre.network.config.polkavm && signers.length < 2) {
    const randomWallet = ethers.Wallet.createRandom();
    other = randomWallet.connect(ethers.provider);
    
    // 直接充值到新账户
    let value;
    if (hre.network.name === 'local') {
      value = ethers.parseEther('100')
    } else {
      value = ethers.parseEther('1')
    }
    
    await wallet.sendTransaction({
      to: other.address,
      value: value
    });
    
    console.log('✅ Created and funded second account:', other.address);
  } else {
    other = signers[1];
    
    // 标准 EVM 模式，给第二个账户充值
    let value;
    if (hre.network.name === 'local') {
      value = ethers.parseEther('100')
    } else {
      value = ethers.parseEther('1')
    }
    
    await wallet.sendTransaction({
      to: other.address,
      value: value
    });
  }
});
```

#### 步骤 3: 修改 test/UniswapV2Pair.js

```javascript
// 原代码 (line 22-24)
beforeEach(async function() {
  [wallet, other] = await ethers.getSigners();
  
  // ...
});

// ⬇️ 修改为：

beforeEach(async function() {
  const signers = await ethers.getSigners();
  wallet = signers[0];
  
  // 在 PolkaVM 模式下动态创建第二个账户
  if (hre.network.config.polkavm && signers.length < 2) {
    const randomWallet = ethers.Wallet.createRandom();
    other = randomWallet.connect(ethers.provider);
    
    // 从 wallet 转账给 other
    await wallet.sendTransaction({
      to: other.address,
      value: ethers.parseEther('100')
    });
    
    console.log('✅ Created second account:', other.address);
  } else {
    other = signers[1];
  }
  
  // ... 其余代码不变
});
```

---

### 方案 2：在 hardhat.config.js 中配置多个私钥 ⚠️ 不推荐

**缺点**：
- ❌ 第二个账户在链上没有资金
- ❌ 需要手动给第二个地址转账
- ❌ 在测试开始前需要额外步骤

```javascript
// hardhat.config.js
networks: {
  hardhat: usePolkaNode && !useREVM ? {
    polkavm: true,
    accounts: [
      "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133",  // wallet
      "0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b",  // other
    ],
    // ... 其余配置
  } : {},
}
```

**问题**：第二个账户的地址在链上没有余额！

需要额外脚本充值：
```javascript
// fund-accounts.js
const { ethers } = require('hardhat');

async function main() {
  const [wallet] = await ethers.getSigners();
  const secondAddress = "0x计算出的第二个地址";
  
  await wallet.sendTransaction({
    to: secondAddress,
    value: ethers.parseEther('100')
  });
}
```

---

### 方案 3：修改 substrate-node 配置 ❌ 最复杂

需要修改 Polkadot SDK 源码，添加预置账户到创世区块。

**不推荐**：需要重新编译，过于复杂。

---

## 推荐实施：方案 1

### 完整实施步骤

1. **备份当前测试文件**
```bash
cd /Users/linkunkun/Documents/web3/2025-h2-solidity-native-polkadot-homework/lesson-5/1921
cp test/UniswapV2Factory.js test/UniswapV2Factory.js.bak
cp test/UniswapV2ERC20.js test/UniswapV2ERC20.js.bak
cp test/UniswapV2Pair.js test/UniswapV2Pair.js.bak
```

2. **应用上述修改**（见上面的代码示例）

3. **测试验证**
```bash
# EVM 测试应该仍然通过
npx hardhat test

# PolkaVM 测试现在应该全部通过
POLKA_NODE=true npx hardhat test
```

---

## 预期结果

修改后的测试结果：

```
  UniswapV2ERC20
    ✅ Created and funded second account: 0x...
    ✔ name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH
    ✔ approve
    ✔ transfer
    ✔ transfer:fail
    ✔ transferFrom
    ✔ transferFrom:max

  UniswapV2Factory
    ✅ Created second account: 0x...
    ✔ feeTo, feeToSetter, allPairsLength
    ✔ createPair
    ✔ createPair:reverse
    ✔ setFeeTo               ← 之前失败，现在通过！
    ✔ setFeeToSetter         ← 之前失败，现在通过！

  UniswapV2Pair
    ✅ Created second account: 0x...
    ✔ mint
    ✔ getInputPrice:0-6
    ✔ optimistic:0-3
    ✔ swap:token0
    ✔ swap:token1
    ✔ burn
    ✔ feeTo:off
    ✔ feeTo:on              ← 之前失败，现在通过！

  28 passing (15m)          ← 全部通过！
```

---

## 为什么方案 1 最好？

### 技术原因
1. **运行时创建**：在测试执行时才创建账户，不依赖预配置
2. **自动充值**：从主账户转账，确保新账户有资金
3. **环境无关**：适用于任何 PolkaVM 环境（本地、测试网、主网）
4. **向后兼容**：不影响 EVM 测试

### 实践原因
1. **最小改动**：只修改测试文件，不改配置
2. **易于理解**：代码逻辑清晰
3. **易于维护**：将来添加更多测试账户很容易

---

## 关键代码模式

这个模式可以复用到任何需要多账户的测试：

```javascript
// 通用模式
beforeEach(async function() {
  const signers = await ethers.getSigners();
  const primaryAccount = signers[0];
  
  let secondaryAccount;
  
  if (hre.network.config.polkavm && signers.length < 2) {
    // PolkaVM 模式：动态创建
    const newWallet = ethers.Wallet.createRandom();
    secondaryAccount = newWallet.connect(ethers.provider);
    
    // 充值
    await primaryAccount.sendTransaction({
      to: secondaryAccount.address,
      value: ethers.parseEther('100')
    });
  } else {
    // EVM 模式：使用预置账户
    secondaryAccount = signers[1];
  }
  
  // 使用 primaryAccount 和 secondaryAccount 进行测试
});
```

---

## 成本分析

| 方案 | 时间成本 | Gas 成本 | 复杂度 |
|-----|---------|---------|--------|
| **方案 1** | ⏱️ 10 分钟 | 💰 每个测试套件 ~0.001 ETH | ⭐ 简单 |
| 方案 2 | ⏱️ 30 分钟 | 💰 需手动充值 | ⭐⭐ 中等 |
| 方案 3 | ⏱️ 2 小时+ | 💰 重新编译时间 | ⭐⭐⭐ 复杂 |

---

## 总结

**是的，必须配置多个账户才能通过全部测试。**

**最佳方案**：在测试中动态创建第二个账户（方案 1）

**预期时间**：
- 修改代码：10 分钟
- 运行测试：15-20 分钟（PolkaVM 较慢）
- 总计：30 分钟内完成

**预期结果**：28/28 测试全部通过 ✅
