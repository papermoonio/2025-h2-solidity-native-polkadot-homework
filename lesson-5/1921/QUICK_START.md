# 快速开始指南

## 前置要求

- Node.js >= 18
- pnpm
- Rust 工具链 (用于编译 PolkaVM 节点)

## 步骤 1: 安装依赖

```bash
cd /Users/linkunkun/Documents/web3/2025-h2-solidity-native-polkadot-homework/lesson-5/1921
pnpm install
```

## 步骤 2: 运行测试

**注意**：本项目使用默认测试私钥，无需配置 `.env` 文件即可运行。

### 选项 A: EVM 测试 (推荐先试)

最快速，无需额外配置：

```bash
npx hardhat test
```

预期结果：28/28 测试通过，耗时 < 1秒

### 选项 B: PolkaVM 测试

需要先编译 Polkadot SDK 二进制文件（已完成）：

```bash
POLKA_NODE=true npx hardhat test
```

预期结果：19/28 测试通过，耗时 ~10分钟

## 常见问题

### Q1: 缺少二进制文件错误

**错误**: `Error: spawn ../revive-dev-node-darwin-arm64 ENOENT`

**解决**: 二进制文件已经位于 `lesson-5/` 目录，确认路径配置正确。

### Q2: 想使用自己的私钥

**方法**: 创建 `.env` 文件并配置：

```bash
cp .env.example .env
# 编辑 .env 添加你的私钥
LOCAL_PRIV_KEY=0x你的私钥
```

**默认行为**: 如果没有 `.env` 文件，会使用代码中的默认测试私钥。

### Q3: 测试超时

**解决**: 在 PolkaVM 模式下，测试需要更长时间。可以增加超时时间：

```javascript
this.timeout(1000000);
```

## 测试模式说明

| 模式 | 命令 | 用途 |
|-----|------|-----|
| **EVM** | `npx hardhat test` | 标准以太坊测试，最快 |
| **PolkaVM** | `POLKA_NODE=true npx hardhat test` | 测试 Polkadot 兼容性 |
| **REVM** | `POLKA_NODE=true REVM=true npx hardhat test` | EVM 在 Polkadot 上 |

## 查看详细报告

完整测试分析见 [TEST_REPORT.md](./TEST_REPORT.md)

## 项目结构

```
1921/
├── contracts/          # Uniswap V2 合约
│   ├── UniswapV2ERC20.sol
│   ├── UniswapV2Factory.sol
│   └── UniswapV2Pair.sol
├── test/              # 测试文件
│   ├── UniswapV2ERC20.js
│   ├── UniswapV2Factory.js
│   └── UniswapV2Pair.js
├── hardhat.config.js  # Hardhat 配置
├── package.json       # 依赖管理
├── .env              # 环境变量 (自行创建)
├── README.md         # 项目说明
├── TEST_REPORT.md    # 详细测试报告
└── QUICK_START.md    # 本文件
```

## 下一步

1. ✅ 运行 EVM 测试验证基础功能
2. ✅ 运行 PolkaVM 测试验证跨链兼容性
3. 📖 阅读 [TEST_REPORT.md](./TEST_REPORT.md) 了解详细结果
4. 🚀 尝试修改合约并重新测试
5. 📝 提交作业到 GitHub

## 有用的命令

```bash
# 编译合约
npx hardhat compile

# 清理编译产物
npx hardhat clean

# 运行单个测试文件
npx hardhat test test/UniswapV2Factory.js

# 查看网络配置
npx hardhat config

# 启动本地节点 (EVM)
npx hardhat node
```

## 支持

如有问题，请参考：
- [Uniswap V2 文档](https://docs.uniswap.org/contracts/v2/overview)
- [Hardhat 文档](https://hardhat.org/docs)
- [Polkadot 文档](https://docs.substrate.io/)
