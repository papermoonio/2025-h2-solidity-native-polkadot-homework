# ERC20 代币合约项目

这是一个使用 Hardhat 框架开发的完整 ERC20 代币合约项目，包含合约实现、测试用例和部署脚本。

## 项目结构

```
ERC20/
├── contracts/
│   └── ERC20Token.sol          # ERC20 代币合约实现
├── test/
│   └── ERC20Token.test.js      # 完整的测试用例
├── scripts/
│   └── deploy.js               # 部署脚本
├── hardhat.config.js           # Hardhat 配置文件
└── package.json                # 项目依赖配置
```

## 功能特性

### ERC20 标准功能
- ✅ `name()` - 返回代币名称
- ✅ `symbol()` - 返回代币符号  
- ✅ `decimals()` - 返回代币精度
- ✅ `totalSupply()` - 返回总供应量
- ✅ `balanceOf(address)` - 查询账户余额
- ✅ `transfer(address, uint256)` - 转账代币
- ✅ `approve(address, uint256)` - 授权代币
- ✅ `allowance(address, address)` - 查询授权额度
- ✅ `transferFrom(address, address, uint256)` - 授权转账

### 额外功能
- ✅ `mint(address, uint256)` - 铸造新代币
- ✅ `burn(uint256)` - 销毁代币

### 安全特性
- ✅ 零地址检查
- ✅ 余额不足检查
- ✅ 授权额度检查
- ✅ 溢出保护（使用 unchecked 块）
- ✅ 事件日志记录

## 安装和运行

### 1. 安装依赖
```bash
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

### 4. 部署合约
```bash
# 在本地网络部署
npm run deploy

# 在指定网络部署
npx hardhat run scripts/deploy.js --network passethub
```

## 测试覆盖

项目包含 30 个全面的测试用例，覆盖以下场景：

### 部署测试 (6个)
- 合约名称、符号、精度设置
- 总供应量和初始分配
- 部署事件验证

### 转账测试 (5个)
- 有效转账
- 余额不足检查
- 零地址检查
- 余额更新验证

### 授权测试 (3个)
- 授权功能
- 零地址授权检查
- 授权更新

### 授权转账测试 (6个)
- 授权转账功能
- 授权额度更新
- 各种错误情况检查

### 铸造测试 (2个)
- 铸造功能
- 零地址铸造检查

### 销毁测试 (3个)
- 销毁功能
- 余额不足检查
- 零地址检查

### 边界情况测试 (4个)
- 零金额操作
- 最大 uint256 值处理

### Gas 优化测试 (1个)
- 基本操作 gas 消耗测量

## 网络配置

项目已配置以下网络：

### 本地网络 (hardhat)
- Chain ID: 1337
- 用于开发和测试

### PassetHub 测试网
- URL: https://testnet-passet-hub-eth-rpc.polkadot.io
- Chain ID: 420420422
- 已配置测试账户

## Gas 消耗

测试结果显示的 gas 消耗：
- 转账: ~52,098 gas
- 授权: ~46,865 gas  
- 授权转账: ~60,278 gas

## 合约接口

### 构造函数
```solidity
constructor(string memory name_, string memory symbol_, uint256 initialSupply_)
```

### 主要函数
```solidity
function name() public view returns (string memory)
function symbol() public view returns (string memory)
function decimals() public view returns (uint8)
function totalSupply() public view returns (uint256)
function balanceOf(address account) public view returns (uint256)
function transfer(address to, uint256 amount) public returns (bool)
function approve(address spender, uint256 amount) public returns (bool)
function allowance(address owner, address spender) public view returns (uint256)
function transferFrom(address from, address to, uint256 amount) public returns (bool)
function mint(address to, uint256 amount) public
function burn(uint256 amount) public
```

### 事件
```solidity
event Transfer(address indexed from, address indexed to, uint256 value)
event Approval(address indexed owner, address indexed spender, uint256 value)
```

## 安全考虑

1. **重入攻击防护**: 使用 Checks-Effects-Interactions 模式
2. **溢出保护**: 在适当位置使用 unchecked 块
3. **零地址检查**: 所有外部函数都包含零地址验证
4. **授权机制**: 完整的 ERC20 授权流程实现

## 开发说明

- 使用 Solidity 0.8.19 版本
- 遵循 ERC20 标准规范
- 不使用外部库，完全自主实现
- 包含详细的中文注释
- 测试覆盖率达到 100%

## 许可证

MIT License
