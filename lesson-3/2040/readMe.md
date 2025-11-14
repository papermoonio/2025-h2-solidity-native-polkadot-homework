# Hardhat配置和部署说明

## 持久化配置

本项目已配置Hardhat使用确定性账户，这意味着每次重启本地网络时：

1. 使用相同的私钥和地址
2. 账户余额保持一致
3. 部署的合约地址保持一致（使用相同的部署脚本）

### 确定性账户配置

Hardhat配置中已添加了3个确定性账户，每个账户初始余额为10000 ETH：

1. Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

2. Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

3. Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
   Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a

## 部署合约

### 使用Ignition部署（推荐）

```bash
npx hardhat ignition deploy ignition/modules/MintableERC20.ts
```

### 使用自定义脚本部署

```bash
npx hardhat run scripts/deploy-mintable-erc20.cjs
```

部署信息会自动保存在 `ignition/deployments/chain-31337/deployed_addresses.json` 文件中。

## 检查已部署合约

### 使用合约检查工具

项目提供了一个专门的合约检查工具，可以查看本地链上的所有合约状态：

```bash
npx hardhat run scripts/check-contracts.ts --network hardhat
```

该工具会显示：
- 当前区块号
- 所有已部署合约的信息
- ERC20 代币详情（名称、符号、总供应量）
- 最近交易记录

详细使用说明请参考：[CONTRACT_CHECK_README.md](CONTRACT_CHECK_README.md)

### 手动检查部署记录

```bash
cat ignition/deployments/chain-31337/deployed_addresses.json
```

## 启动本地网络

```bash
npx hardhat node
```

由于使用了确定性账户配置，每次启动网络时账户信息都将保持一致。
