# Mintable ERC20 Token Project

这是一个基于ERC20的可铸造代币项目，包含智能合约和前端界面。

## 项目结构

```
Erc20Mintable/
├── Contracts/          # Hardhat智能合约项目
│   ├── contracts/      # Solidity合约文件
│   ├── test/          # 测试文件
│   ├── scripts/       # 部署脚本
│   └── artifacts/     # 编译后的ABI文件（编译后生成）
└── Web/               # Vite + React前端项目
    ├── src/
    │   ├── components/ # React组件
    │   ├── hooks/     # React Hooks
    │   └── ...
    └── abi/           # 合约ABI文件
```

## 合约功能

- 基于OpenZeppelin的ERC20标准实现
- 任何人都可以铸造代币
- 每个地址每小时只能铸造一次
- 每次铸造1个代币

## 快速开始

### 1. 安装合约依赖

```bash
cd Contracts
npm install
```

### 2. 编译合约

```bash
npm run compile
```

### 3. 运行测试

```bash
npm run test
```

### 4. 部署合约（本地Hardhat网络）

首先启动本地Hardhat节点：

```bash
npx hardhat node
```

然后在另一个终端部署合约：

```bash
npm run deploy
```

部署后会输出合约地址，请保存这个地址。

### 5. 复制ABI文件到前端项目

```bash
cp artifacts/contracts/MintableERC20.sol/MintableERC20.json ../Web/abi/MintableERC20.json
```

### 6. 配置前端环境变量

在 `Web` 目录下创建 `.env` 文件：

```bash
cd ../Web
echo "VITE_CONTRACT_ADDRESS=你的合约地址" > .env
```

### 7. 安装前端依赖

```bash
npm install
```

### 8. 启动前端开发服务器

```bash
npm run dev
```

前端会运行在 `http://localhost:5173`（或Vite默认端口）

## Vite代理配置

前端项目已配置Vite代理，将 `/rpc` 路径的请求转发到 `http://localhost:8545`。这样前端可以通过代理访问本地Hardhat节点，避免CORS问题。

## 前端功能

1. **钱包连接**: 支持MetaMask等以太坊钱包
2. **合约信息显示**: 显示代币名称、符号、总供应量、余额等
3. **铸币功能**: 可以铸造代币，显示倒计时
4. **铸币记录**: 显示历史铸币记录

## 技术栈

### 合约
- Solidity 0.8.20
- Hardhat 2.19.0
- OpenZeppelin Contracts 5.0.0
- Ethers.js 6.x

### 前端
- React 18.2.0
- Vite 5.0.8
- Ethers.js 6.9.0

## 注意事项

1. 确保Hardhat节点运行在8545端口
2. 部署合约后，记得更新前端的 `.env` 文件中的合约地址
3. 编译合约后，记得将ABI文件复制到前端项目的 `abi` 目录
4. 前端需要连接钱包才能进行铸币操作

## 开发说明

### 合约测试

测试文件使用Hardhat和Ethers.js编写，包含以下测试场景：
- 合约部署测试
- 铸币功能测试
- 时间限制测试
- 视图函数测试

### 前端模块

前端代码按功能模块划分：
- `components/WalletConnection.jsx` - 钱包连接组件
- `components/ContractInfo.jsx` - 合约信息显示组件
- `components/MintSection.jsx` - 铸币功能组件
- `components/MintHistory.jsx` - 铸币历史记录组件
- `hooks/useContract.js` - 合约交互Hook

