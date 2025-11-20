# Delegatecall 示例

这个项目展示了如何在 Solidity 中使用 `delegatecall` 来实现代理模式。

## 项目结构

- `contracts/LogicContract.sol` - 逻辑合约，包含实际的业务逻辑
- `contracts/ProxyContract.sol` - 代理合约，使用 delegatecall 调用逻辑合约
- `test/DelegateCall.test.js` - 测试用例

## Delegatecall 的关键特性

1. **上下文保持**：delegatecall 在调用者的上下文中执行代码
2. **状态修改**：所有状态变量的修改都发生在代理合约的存储中
3. **msg.sender 保持**：msg.sender 和 msg.value 保持为原始调用者
4. **存储布局**：代理合约和逻辑合约的状态变量布局必须一致

## 安装依赖

```bash
npm install
```

## 运行测试

```bash
npm test
```

## 合约说明

### LogicContract（逻辑合约）

包含实际的业务逻辑：
- `increment()` - 增加计数器
- `setCounter(uint256)` - 设置计数器值
- `getCounter()` - 获取计数器值

### ProxyContract（代理合约）

使用 delegatecall 调用逻辑合约：
- `incrementViaDelegate()` - 通过 delegatecall 调用 increment
- `setCounterViaDelegate(uint256)` - 通过 delegatecall 调用 setCounter
- `getCounter()` - 直接读取代理合约的状态
- `updateLogicContract(address)` - 更新逻辑合约地址（可升级）

## 测试覆盖

测试用例验证了：
- ✅ 合约正确部署
- ✅ 通过 delegatecall 调用后，代理合约的状态被正确更新
- ✅ 逻辑合约的状态保持不变
- ✅ 多次调用的累积效果
- ✅ 事件正确触发
- ✅ 逻辑合约可升级，状态保持不变
- ✅ 权限控制正确

## 重要注意事项

⚠️ **状态变量布局必须一致**：代理合约和逻辑合约的状态变量声明顺序和类型必须完全一致，否则会导致存储槽错位。

⚠️ **安全性**：在生产环境中使用代理模式时，需要考虑更多的安全因素，建议使用经过审计的代理模式实现（如 OpenZeppelin 的代理合约）。
