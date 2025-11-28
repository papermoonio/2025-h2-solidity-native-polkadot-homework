# Uniswap V2 - Polkadot Hub 开发指南

## 项目概述

这是一个将以太坊 Uniswap V2 去中心化交易所协议移植到 Polkadot PolkaVM 环境的项目。通过硬编码的分叉支持 Polkadot 生态系统中的去中心化交易功能。

## 环境要求

### 系统要求
- **操作系统**: Linux/macOS (推荐)
- **Node.js**: >= 18.0.0
- **Rust & Cargo**: >= 1.70.0 (用于构建 PolkaVM 二进制文件)
- **Git**: >= 2.0

### 网络环境
- **互联网接入**: 需要下载依赖和编译器
- **端口可用**: 8545 (ETH RPC), 9944 (Polkadot RPC)

## 安装流程

### 1. 克隆项目
```bash
git clone https://github.com/papermoonio/uniswap-v2-polkadot.git
cd uniswap-v2-polkadot
```

### 2. 安装项目依赖
```bash
pnpm install
```

### 3. 配置环境变量
复制环境配置模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下变量：
```env
LOCAL_PRIV_KEY=0x你的32字节私钥
AH_PRIV_KEY=0x另一个32字节私钥
```

### 4. 构建 PolkaVM 二进制文件

#### 方法一：自动构建（推荐）
项目已包含构建脚本，执行：
```bash
# 克隆 Polkadot SDK 源代码
git clone https://github.com/paritytech/polkadot-sdk ./polkadot-sdk-temp
cd polkadot-sdk-temp

# 切换到指定版本
git checkout c40b36c3a7c208f9a6837b80812473af3d9ba7f7

# 构建 substrate-node
cargo build --bin substrate-node --release

# 构建 eth-rpc 适配器
cargo build -p pallet-revive-eth-rpc --bin eth-rpc --release

# 复制二进制文件到 bin 目录
cd ..
mkdir -p bin
cp polkadot-sdk-temp/target/release/substrate-node bin/
cp polkadot-sdk-temp/target/release/eth-rpc bin/

# 清理临时文件
rm -rf polkadot-sdk-temp
```

#### 方法二：手动获取
如有预编译二进制文件，可直接复制到 `bin/` 目录：
```bash
mkdir -p bin
cp /path/to/substrate-node bin/
cp /path/to/eth-rpc bin/
```

## 项目结构

```
uniswap-v2-polkadot/
├── bin/                    # PolkaVM 二进制文件
│   ├── substrate-node      # Polkadot 节点
│   └── eth-rpc            # ETH RPC 适配器
├── contracts/              # Solidity 智能合约
│   ├── UniswapV2ERC20.sol  # ERC20 代币合约
│   ├── UniswapV2Factory.sol # 工厂合约
│   ├── UniswapV2Pair.sol   # 交易对合约
│   └── interfaces/         # 合约接口
├── test/                   # 测试文件
├── scripts/                # 部署脚本
└── tasks/                  # 自定义 Hardhat 任务
```

## 开发流程

### 1. 启动本地 PolkaVM 节点

#### 方法一：使用项目脚本
```bash
# 启动完整 PolkaVM 环境 (推荐)
POLKA_NODE=true npx hardhat node
```

#### 方法二：手动启动
```bash
# 终端1：启动 substrate 节点
./bin/substrate-node --dev --rpc-port 9944 --ws-port 9945

# 终端2：启动 ETH RPC 适配器
./bin/eth-rpc --dev --polkadot-url ws://127.0.0.1:9945 --rpc-port 8545
```

### 2. 编译合约
```bash
# 编译 Solidity 合约
POLKA_NODE=true npx hardhat compile
```

### 3. 部署合约到本地网络
```bash
# 部署到本地 PolkaVM 网络
POLKA_NODE=true npx hardhat run scripts/deploy.js --network local
```

### 4. 本地开发测试
```bash
# 启动完整的本地测试环境
POLKA_NODE=true npx hardhat test
```

### 5. 代码修改与重新测试
```bash
# 修改合约后重新编译
POLKA_NODE=true npx hardhat compile

# 重新部署
POLKA_NODE=true npx hardhat run scripts/deploy.js --network local

# 运行指定测试
POLKA_NODE=true npx hardhat test --network local --grep "测试名称"
```

## 测试流程

### 1. 单元测试

#### 基本测试 (推荐用于开发)
```bash
# 测试 ERC20 合约基本功能
POLKA_NODE=true npx hardhat test --network local --grep "name, symbol, decimals"

# 测试 Factory 合约
POLKA_NODE=true npx hardhat test --network local --grep "feeTo, feeToSetter"

# 测试 Pair 合约
POLKA_NODE=true npx hardhat test --network local --grep "mint"
```

#### 完整测试套件
```bash
# 运行所有测试 (需要完整 PolkaVM 环境)
POLKA_NODE=true npx hardhat test
```

### 2. 手动测试部署
```bash
# 连接到本地节点手动测试
POLKA_NODE=true npx hardhat console --network local

# 在控制台中：
const Factory = await ethers.getContractFactory("UniswapV2Factory");
const factory = await Factory.deploy("0x...");
await factory.waitForDeployment();
console.log("Factory deployed at:", await factory.getAddress());
```

### 3. 网络切换测试

#### 本地 PolkaVM 测试
```bash
POLKA_NODE=true npx hardhat test --network local
```

#### Polkadot 测试网测试
```bash
POLKA_NODE=true npx hardhat test --network passetHub
```

#### EVM 兼容性测试
```bash
REVM=true npx hardhat test --network local
```

## 上线流程

### 1. 代码审查与优化
```bash
# 运行完整的测试套件
POLKA_NODE=true npx hardhat test

# 检查合约大小
POLKA_NODE=true npx hardhat compile
npx hardhat size-contracts

# 代码覆盖率
npx hardhat coverage
```

### 2. 合约部署前准备
```bash
# 确保使用生产环境私钥
# 编辑 .env 文件，设置生产账户

# 测试部署脚本
POLKA_NODE=true npx hardhat run scripts/deploy.js --network local --dry-run
```

### 3. 测试网部署
```bash
# 部署到 Polkadot Asset Hub 测试网
POLKA_NODE=true npx hardhat run scripts/deploy.js --network passetHub
```

### 4. 验证部署
```bash
# 验证合约部署成功
POLKA_NODE=true npx hardhat verify --network passetHub CONTRACT_ADDRESS

# 运行集成测试
POLKA_NODE=true npx hardhat test --network passetHub
```

### 5. 主网部署
```bash
# 部署到 Polkadot Asset Hub 主网
POLKA_NODE=true npx hardhat run scripts/deploy.js --network passetHubMainnet

# 等待确认...
# 验证部署
POLKA_NODE=true npx hardhat verify --network passetHubMainnet CONTRACT_ADDRESS
```

### 6. 初始化与配置
```bash
# 设置协议费接收地址 (如果需要)
# 为主要交易对创建初始流动性
```

## 故障排除

### 常见问题

#### 1. 二进制文件缺失
```
Error: Cannot find module './bin/substrate-node'
```
**解决方法**:
```bash
# 重新构建二进制文件
git clone https://github.com/paritytech/polkadot-sdk polkadot-sdk-temp
cd polkadot-sdk-temp && git checkout c40b36c3a7c208f9a6837b80812473af3d9ba7f7
cargo build --bin substrate-node --release
cargo build -p pallet-revive-eth-rpc --bin eth-rpc --release
cd .. && cp polkadot-sdk-temp/target/release/* bin/
```

#### 2. 端口占用
```
Error: Port 8545 is already in use
```
**解决方法**:
```bash
# 检查端口占用
lsof -i :8545
kill -9 <PID>

# 或使用不同端口
POLKA_NODE=true npx hardhat test --network localNode
```

#### 3. 合约部署失败
```
ProviderError: Failed to instantiate contract: Module(ModuleError { index: 5, error: [27, 0, 0, 0], message: Some("CodeRejected") })
```
**解决方法**:
- 检查 PolkaVM 节点是否正在运行
- 确保合约代码兼容 PolkaVM (避免 inline assembly)
- 尝试重新编译 `POLKA_NODE=true npx hardhat compile`

#### 4. 测试失败
```
TypeError: Cannot read properties of undefined (reading 'getAddress')
```
**解决方法**:
- 确保 `getWallets` 函数正确使用 `ethers.getSigners()`
- 检查网络配置中的账户设置

### 性能优化

#### 合约优化
```bash
# 检查合约大小并优化
POLKA_NODE=true npx hardhat size-contracts

# 运行气体分析
POLKA_NODE=true npx hardhat test --gas
```

#### 测试优化
```bash
# 并行运行测试
POLKA_NODE=true npx hardhat test --parallel

# 运行特定测试避免全量重跑
POLKA_NODE=true npx hardhat test --grep "Factory"
```

## 维护指南

### 版本更新
```bash
# 更新依赖
pnpm update

# 更新 PolkaVM SDK 版本
cd polkadot-sdk-temp
git pull origin master
git checkout 新版本标签
cargo build --release --bin substrate-node
cargo build -p pallet-revive-eth-rpc --bin eth-rpc --release
```

### 监控和日志
```bash
# 查看合约事件
POLKA_NODE=true npx hardhat console --network local
# 在控制台中监听事件

# 查看燃气使用情况
POLKA_NODE=true npx hardhat test --gas-reporter
```

---

## 快速开始命令总结

### 开发环境设置
```bash
# 1. 安装依赖
pnpm install

# 2. 构建 PolkaVM 二进制
git clone https://github.com/paritytech/polkadot-sdk polkadot-sdk-temp
cd polkadot-sdk-temp && git checkout c40b36c3a7c208f9a6837b80812473af3d9ba7f7
cargo build --bin substrate-node --release
cargo build -p pallet-revive-eth-rpc --bin eth-rpc --release
cd .. && cp polkadot-sdk-temp/target/release/* bin/ && rm -rf polkadot-sdk-temp

# 3. 配置环境
cp .env.example .env

# 4. 快速测试
POLKA_NODE=true npx hardhat test --network local --grep "ERC20"
```

### 完整测试
```bash
POLKA_NODE=true npx hardhat test
```

### 生产部署
```bash
POLKA_NODE=true npx hardhat run scripts/deploy.js --network passetHub
```

---

## 联系支持

如遇问题，请参考：
- [Polkadot Documentation](https://docs.polkadot.network/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Uniswap V2 Documentation](https://docs.uniswap.org/protocol/V2/introduction)

最后更新: 2025-11-25
