# 合约检查工具使用文档

## 📋 概述

`check-contracts.ts` 是一个用于检查本地 Hardhat 网络上已部署合约的工具脚本。它可以帮助开发者：

- 查看当前网络状态和区块信息
- 检查部署记录中的所有合约
- 验证合约代码是否存在
- 读取 ERC20 代币的基本信息
- 查看最近的交易记录

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Hardhat 项目
- 已安装依赖：`npm install` 或 `pnpm install`

### 运行脚本

```bash
# 检查本地 Hardhat 网络上的合约
npx hardhat run scripts/check-contracts.ts --network hardhat

# 检查其他网络（需要配置相应网络）
npx hardhat run scripts/check-contracts.ts --network localhost
```

## 📊 输出说明

### 基本信息
```
🔍 检查本地链上的合约...

📦 当前区块号: 3
```
显示当前区块链的最新区块号。

### 部署记录检查
```
📋 部署记录:
  MintableERC20Module#MintableERC20: 0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0
    ✅ 合约代码存在 (10260 字节)
    📝 代币信息: Alpha (ALPHA)
    💰 总供应量: 100000 ALPHA
```

- **合约地址**: 显示部署的合约地址
- **代码状态**: 检查合约字节码是否存在
- **代币信息**: 自动识别 ERC20 代币的名称和符号
- **供应量**: 显示代币总供应量（格式化为可读数字）

### 交易记录
```
🔄 最近交易:
  最新区块包含 1 笔交易
    0x5179e6d1e5874ae51a4974f9af16254250a9e6a3e65ea339135bd1cbdd42fa56: 0xf39fd6e51aad88f6f4ce6ab8827279cff
fb92266 → 合约创建
```

显示最近区块中的交易信息，包括：
- 交易哈希
- 发送者地址
- 接收者地址（或"合约创建"表示合约部署）

## 🔧 脚本功能详解

### 1. 网络连接
```typescript
const client = createPublicClient({
  chain: hardhat,
  transport: http(),
});
```
连接到指定的区块链网络。

### 2. 部署文件读取
```typescript
const deploymentPath = path.join(__dirname, "..", "ignition", "deployments", "chain-31337", "deployed_addresses.json");
```
读取 Hardhat Ignition 的部署记录文件。

### 3. 合约验证
```typescript
const code = await client.getCode({ address: address as `0x${string}` });
```
检查合约地址是否有字节码，确认合约是否真实部署。

### 4. ERC20 信息读取
尝试读取标准 ERC20 函数：
- `name()` - 代币名称
- `symbol()` - 代币符号
- `totalSupply()` - 总供应量

### 5. 交易历史
```typescript
const block = await client.getBlock({ blockTag: "latest", includeTransactions: true });
```
获取最新区块的交易信息。

## 📁 文件结构

```
scripts/
├── check-contracts.ts      # 主检查脚本
├── deploy-mintable-erc20.ts # 部署脚本
└── deploy-mintable-erc20.cjs # 兼容版本

ignition/
└── deployments/
    └── chain-31337/
        └── deployed_addresses.json # 部署记录
```

## ⚙️ 配置选项

### 支持的网络
- `hardhat`: 本地 Hardhat 网络（默认）
- `localhost`: 本地节点
- 其他已配置网络

### 自定义配置
可以在脚本中修改：
- 检查的区块数量
- 显示的交易数量
- 支持的合约类型

## 🛠️ 故障排除

### 常见问题

**1. "未找到部署记录文件"**
```
❌ 未找到部署记录文件
```
**解决**: 确保已运行部署脚本且文件存在于 `ignition/deployments/chain-31337/deployed_addresses.json`

**2. "不是 ERC20 合约或读取失败"**
```
⚠️  不是 ERC20 合约或读取失败
```
**解决**: 合约可能不是 ERC20 标准，或者网络连接问题

**3. 网络连接失败**
**解决**: 确保 Hardhat 网络正在运行，或检查网络配置

### 调试模式

添加详细日志：
```typescript
console.log("调试信息:", variable);
```

## 📈 扩展功能

### 添加新合约类型检查

```typescript
// 检查 ERC721 合约
try {
  const tokenURI = await client.readContract({
    address: contractAddress,
    abi: [{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"}],
    functionName: "tokenURI",
    args: [BigInt(1)]
  });
  console.log(`    🎨 NFT 合约，示例 TokenURI: ${tokenURI}`);
} catch (error) {
  // 不是 ERC721
}
```

### 批量检查多个网络

```typescript
const networks = ['hardhat', 'localhost', 'sepolia'];
for (const network of networks) {
  console.log(`\n🌐 检查网络: ${network}`);
  // 运行检查逻辑
}
```

## 🔍 实际使用示例

### 示例输出
```
🔍 检查本地链上的合约...

📦 当前区块号: 5

📋 部署记录:
  MintableERC20Module#MintableERC20: 0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0
    ✅ 合约代码存在 (10260 字节)
    📝 代币信息: Alpha (ALPHA)
    💰 总供应量: 100000 ALPHA

🔄 最近交易:
  最新区块包含 2 笔交易
    0x5179e6d1e5874ae51a4974f9af16254250a9e6a3e65ea339135bd1cbdd42fa56: 0xf39fd6e51aad88f6f4ce6ab8827279cff
fb92266 → 合约创建
    0x8c7e6d1e5874ae51a4974f9af16254250a9e6a3e65ea339135bd1cbdd42fa57: 0xf39fd6e51aad88f6f4ce6ab8827279cff
fb92266 → 0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0
```

## 📚 相关链接

- [Hardhat 官方文档](https://hardhat.org/docs)
- [Viem 文档](https://viem.sh/)
- [ERC20 标准](https://eips.ethereum.org/EIPS/eip-20)

## 🤝 贡献

如需添加新功能或修复问题，请修改 `scripts/check-contracts.ts` 文件并测试所有场景。

---

**最后更新**: 2025-11-09
