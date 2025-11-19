# ERC20 Token Implementation

完全自主实现的 ERC20 代币合约，使用 Hardhat 框架，不依赖任何外部库（如 OpenZeppelin）。

## 项目结构

```
├── contracts/
│   ├── IERC20.sol      # ERC20 标准接口定义
│   └── ERC20.sol       # ERC20 合约实现
├── test/
│   └── ERC20.test.ts   # 完整的测试用例
├── hardhat.config.ts    # Hardhat 配置
├── package.json         # 项目依赖
└── tsconfig.json        # TypeScript 配置
```

## 功能特性

本实现完全符合 [ERC20 标准](https://eips.ethereum.org/EIPS/eip-20)，包含以下功能：

### 标准接口函数

- `totalSupply()` - 查询代币总供应量
- `balanceOf(address)` - 查询账户余额
- `transfer(address, uint256)` - 转账功能
- `approve(address, uint256)` - 授权功能
- `allowance(address, address)` - 查询授权额度
- `transferFrom(address, address, uint256)` - 授权转账功能

### 元数据

- `name()` - 代币名称
- `symbol()` - 代币符号
- `decimals()` - 小数位数

### 事件

- `Transfer(address indexed from, address indexed to, uint256 value)`
- `Approval(address indexed owner, address indexed spender, uint256 value)`

## 安装依赖

```bash
npm install
```

## 编译合约

```bash
npm run compile
# 或
npx hardhat compile
```

## 运行测试

```bash
npm test
# 或
npx hardhat test
```

## 测试覆盖

测试用例覆盖了所有接口函数和多种场景：

- ✅ 部署和初始化测试
- ✅ `totalSupply()` 测试
- ✅ `balanceOf()` 测试
- ✅ `transfer()` 测试（包括边界情况）
- ✅ `approve()` 测试
- ✅ `allowance()` 测试
- ✅ `transferFrom()` 测试
- ✅ 事件触发测试
- ✅ 边界情况测试（零金额、最大金额等）
- ✅ 集成测试

## 技术栈

- **Solidity**: ^0.8.28
- **Hardhat**: ^2.26.5
- **TypeScript**: ^5.9.3
- **Ethers.js**: ^6.15.0

## 代码特点

1. **零外部依赖**: 不依赖 OpenZeppelin 或其他第三方库
2. **完整实现**: 实现了 ERC20 标准的所有必需功能
3. **安全性**: 包含完整的输入验证和错误处理
4. **Gas 优化**: 使用 `unchecked` 块优化安全的算术运算
5. **全面测试**: 覆盖所有函数和边界情况

## 许可证

MIT License
