# ERC20 Token Implementation

这是一个使用 Hardhat 实现的 ERC20 代币合约，完全从零开始实现，不依赖任何第三方库（如 OpenZeppelin）。

## 项目结构

```
.
├── contracts/
│   ├── IERC20.sol      # ERC20 接口定义
│   └── MyERC20.sol     # ERC20 合约实现
├── test/
│   └── MyERC20.test.js # 测试用例
├── hardhat.config.js   # Hardhat 配置
└── package.json        # 项目依赖
```

## 功能特性

### ERC20 标准接口实现

1. **totalSupply()** - 返回代币总供应量
2. **balanceOf(address)** - 查询指定地址的余额
3. **transfer(address, uint256)** - 转账代币
4. **approve(address, uint256)** - 授权代币支出
5. **allowance(address, address)** - 查询授权额度
6. **transferFrom(address, address, uint256)** - 从授权账户转账

### 事件

- **Transfer** - 代币转账事件
- **Approval** - 授权事件

## 安装依赖

```bash
npm install
```

## 编译合约

```bash
npx hardhat compile
```

## 运行测试

```bash
npx hardhat test
```

## 测试覆盖

测试用例覆盖了所有 ERC20 接口的功能：

### Deployment 测试
- ✓ 正确设置代币名称
- ✓ 正确设置代币符号
- ✓ 正确设置代币精度
- ✓ 将总供应量分配给部署者

### totalSupply 测试
- ✓ 返回总供应量
- ✓ 转账后总供应量保持不变

### balanceOf 测试
- ✓ 返回正确的余额
- ✓ 空地址余额为零
- ✓ 转账后余额正确更新

### transfer 测试
- ✓ 账户间转账
- ✓ 余额不足时失败
- ✓ 向零地址转账失败
- ✓ 多次转账后余额正确

### approve 测试
- ✓ 设置正确的授权额度
- ✓ 向零地址授权失败
- ✓ 允许多个授权
- ✓ 更新授权额度

### allowance 测试
- ✓ 未设置授权时返回零
- ✓ 返回正确的授权额度
- ✓ transferFrom 使用全部额度后返回零
- ✓ 部分 transferFrom 后返回正确额度

### transferFrom 测试
- ✓ 使用授权额度转账
- ✓ 授权额度不足时失败
- ✓ 余额不足时失败
- ✓ 从零地址转账失败
- ✓ 向零地址转账失败
- ✓ 允许多次 transferFrom 调用
- ✓ 未授权时不允许 transferFrom

### 集成测试
- ✓ 完整流程：approve -> transferFrom -> transfer
- ✓ 所有操作后总供应量保持不变

**总计：30 个测试用例全部通过**

## 合约部署

合约构造函数参数：
- `_name`: 代币名称
- `_symbol`: 代币符号
- `_decimals`: 代币精度（通常为 18）
- `_initialSupply`: 初始供应量

示例：
```solidity
MyERC20 token = new MyERC20(
    "My Token",
    "MTK",
    18,
    1000000 * 10**18
);
```

## 技术栈

- **Hardhat**: 开发框架
- **Solidity**: 0.8.20
- **Chai**: 测试断言库
- **Ethers.js**: 以太坊交互库

## 许可证

MIT

