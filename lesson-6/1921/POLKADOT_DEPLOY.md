# 部署到 Polkadot Asset Hub 测试网

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装依赖
npm install

# 创建环境变量文件
cp .env.example .env
```

### 2. 配置私钥

编辑 `.env` 文件，添加你的私钥：

```bash
# 你的钱包私钥（不要包含 0x 前缀）
PRIVATE_KEY=your_private_key_here_without_0x_prefix
```

**⚠️ 安全提醒：**
- 永远不要将 `.env` 文件提交到 git
- 只使用测试网私钥，不要使用主网私钥
- 确保私钥对应的地址有足够的测试代币

### 3. 获取测试代币

访问 [Polkadot Faucet](https://faucet.polkadot.io/) 获取测试代币：

1. 连接你的钱包
2. 选择 "Asset Hub Testnet"
3. 申请测试代币

### 4. 编译合约

```bash
npx hardhat compile
```

### 5. 部署合约

```bash
# 部署到 Polkadot Asset Hub 测试网
npx hardhat run scripts/deploy.js --network passetHub
```

### 6. 运行测试（可选）

```bash
# 在本地网络测试
npx hardhat test

# 在 Polkadot 测试网测试（需要消耗真实代币）
npx hardhat test --network passetHub
```

## 🌐 网络信息

- **网络名称**: Polkadot Asset Hub Testnet
- **RPC URL**: https://testnet-passet-hub-eth-rpc.polkadot.io
- **Chain ID**: 420420422
- **区块浏览器**: https://assethub-polkadot-testnet.subscan.io/
- **水龙头**: https://faucet.polkadot.io/

## 📋 部署后验证

部署成功后，你可以：

1. **在区块浏览器查看合约**
   - 访问 https://assethub-polkadot-testnet.subscan.io/
   - 搜索合约地址

2. **验证重入攻击**
   - 使用部署脚本输出的合约地址
   - 运行测试验证攻击是否成功

3. **与合约交互**
   - 使用 MetaMask 连接到 Polkadot Asset Hub
   - 直接调用合约函数

## 🔧 故障排除

### 部署失败

**错误**: `insufficient funds`
**解决**: 确保账户有足够的测试代币

**错误**: `nonce too high`
**解决**: 等待几秒后重试，或重置 MetaMask nonce

**错误**: `network connection`
**解决**: 检查网络连接，确认 RPC URL 可访问

### 测试失败

**错误**: `contract not deployed`
**解决**: 先运行部署脚本

**错误**: `gas estimation failed`
**解决**: 增加 gas limit 或检查合约逻辑

## 📚 相关资源

- [Polkadot 官方文档](https://docs.polkadot.network/)
- [Asset Hub 文档](https://wiki.polkadot.network/docs/learn-assets)
- [Hardhat 文档](https://hardhat.org/docs)
- [重入攻击详解](https://consensys.github.io/smart-contract-best-practices/attacks/reentrancy/)

## ⚠️ 免责声明

本项目仅用于教育目的，演示智能合约漏洞。请勿用于攻击真实合约或进行任何非法活动。
