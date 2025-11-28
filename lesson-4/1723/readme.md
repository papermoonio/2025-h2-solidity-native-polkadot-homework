创建了三个合约文件：

1、Logic.sol：逻辑合约，包含一个简单的计数器功能：
- number：存储计数值的状态变量
- increment()：每次调用时将计数器加1
- getNumber()：获取当前计数值

2、Proxy.sol：代理合约，使用 delegatecall 调用逻辑合约：
- number：与逻辑合约具有相同的状态变量布局
- logicContract：存储逻辑合约地址
- increment()：使用 delegatecall 调用逻辑合约的 increment 函数
- getNumber()：获取当前计数值

3、Test.sol：测试合约，用于验证 delegatecall 的正确性：
- setUp()：部署逻辑合约和代理合约
- testDelegatecall()：测试函数，验证：
    - 代理合约的状态是否正确更新
    - 多次调用是否正确累加
    - 逻辑合约的状态是否保持不变

这个实现展示了 delegatecall 的关键特性：
- 代理合约保持了相同的状态变量布局
- 执行逻辑合约的代码时使用代理合约的上下文
- 状态变更发生在代理合约中，而不是逻辑合约中

使用 Hardhat 开发环境来部署和测试这些合约，步骤为：
1、安装依赖==>npm install
2、部署合约==>npx hardhat deploy
3、测试合约==>npx hardhat test