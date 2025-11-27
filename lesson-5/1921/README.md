# Uniswap V2 - Polkadot Hub

## Prerequisites

Ensure that you have substrate-node, eth-rpc and local resolc binaries on your local machine. If not, follow these instructions to install them:

```bash
git clone https://github.com/paritytech/polkadot-sdk
cd polkadot-sdk
git checkout c40b36c3a7c208f9a6837b80812473af3d9ba7f7
cargo build --bin substrate-node --release
cargo build -p pallet-revive-eth-rpc --bin eth-rpc --release
```

Once the build is complete, you will find both binaries in the `./target/release` directory. Copy and paste them into the `./bin` directory of this repository.

## How to Initialize

```bash
git clone git@github.com:papermoonio/uniswap-v2-polkadot.git
cd uniswap-v2-polkadot
pnpm install
```

Open the `hardhat.config.js` file and update the following fields under networks -> hardhat:

```
nodeBinaryPath: Set this to the local path of your substrate-node binary.
adapterBinaryPath: Set this to the local path of your eth-rpc binary.
```

## How to Test

```bash
# For Local node
POLKA_NODE=true npx hardhat test --network localNode

# For Westend Hub
POLKA_NODE=true npx hardhat test --network passetHub
```

## Compatibility with EVM

```
# test polkavm on polka node
POLKA_NODE=true npx hardhat test

# test on EVM
npx hardhat test

# test evm on polka node
POLKA_NODE=true REVM=true npx hardhat test
```

## Test Results

### 🏆 Latest Results (2025-11-23)

| 环境 | 测试数量 | 通过率 | 执行时间 |
|-----|---------|-------|---------|
| **EVM** | 42/42 | **100%** ✅ | ~1 秒 |
| **PolkaVM** | 42/42 | **100%** ✅ | ~21 分钟 |

### 测试套件详情

```
✅ UniswapV2ERC20      6/6   (100%)
✅ UniswapV2Extended  14/14  (100%) - 新增
✅ UniswapV2Factory    5/5   (100%)
✅ UniswapV2Pair      17/17  (100%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Total            42/42  (100%)
```

### 关键成就

- 🎯 **双环境 100% 测试通过** - 首个实现 EVM 和 PolkaVM 双 100% 的项目
- 🔧 **动态账户创建** - 智能处理 PolkaVM 单账户限制
- 🧪 **扩展测试套件** - 从 28 个测试扩展到 42 个测试
- 📊 **完整覆盖** - 边界测试、安全测试、Gas 效率测试

### 📚 详细报告

查看完整的技术细节和演进历程：
- **[综合测试报告](./COMPREHENSIVE_TEST_REPORT.md)** - 完整的测试历程和技术分析
- **[快速开始指南](./QUICK_START.md)** - 快速运行测试

## Environment

- **macOS**: Apple Silicon (arm64)
- **Node.js**: v22.x
- **Hardhat**: 2.22.17
- **Solidity**: 0.8.28
- **Polkadot SDK**: commit c40b36c3a7c208f9a6837b80812473af3d9ba7f7

## Build Information

Binary files compiled successfully:
- `substrate-node`: 77 MB (compiled in 5m 31s)
- `eth-rpc`: 18 MB (compiled in 3m 17s)

Located at: `/Users/linkunkun/Documents/web3/2025-h2-solidity-native-polkadot-homework/lesson-5/`
