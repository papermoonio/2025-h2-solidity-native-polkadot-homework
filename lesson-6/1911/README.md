# Sample Hardhat 3 Beta Project (`mocha` and `ethers`)

This project showcases a Hardhat 3 Beta project using `mocha` for tests and the `ethers` library for Ethereum interactions.

To learn more about the Hardhat 3 Beta, please visit the [Getting Started guide](https://hardhat.org/docs/getting-started#getting-started-with-hardhat-3). To share your feedback, join our [Hardhat 3 Beta](https://hardhat.org/hardhat3-beta-telegram-group) Telegram group or [open an issue](https://github.com/NomicFoundation/hardhat/issues/new) in our GitHub issue tracker.

## Project Overview

This example project includes:

- A simple Hardhat configuration file.
- Foundry-compatible Solidity unit tests.
- TypeScript integration tests using `mocha` and ethers.js
- Examples demonstrating how to connect to different types of networks, including locally simulating OP mainnet.

## Usage

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat test
```

You can also selectively run the Solidity or `mocha` tests:

```shell
npx hardhat test solidity
npx hardhat test mocha
```

### Make a deployment to Sepolia

This project includes an example Ignition module to deploy the contract. You can deploy this module to a locally simulated chain or to Sepolia.

To run the deployment to a local chain:

```shell
npx hardhat ignition deploy ignition/modules/Counter.ts
```

To run the deployment to Sepolia, you need an account with funds to send the transaction. The provided Hardhat configuration includes a Configuration Variable called `SEPOLIA_PRIVATE_KEY`, which you can use to set the private key of the account you want to use.

You can set the `SEPOLIA_PRIVATE_KEY` variable using the `hardhat-keystore` plugin or by setting it as an environment variable.

To set the `SEPOLIA_PRIVATE_KEY` config variable using `hardhat-keystore`:

```shell
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

After setting the variable, you can run the deployment with the Sepolia network:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts

---

# 重入攻击演示：VulnerableBank 与 ReentrancyAttacker

## 技术说明
- 核心漏洞原理：外部交互（`call{value: ...}`）发生在状态更新之前，违反检查-生效-交互（CEI）模式，攻击者可以在回调中再次调用同一提款函数，从而在单次事务内重复提取。
- 漏洞代码逐行分析（关键片段）：
  - `contracts/VulnerableBank.sol:51-60` 使用 `msg.sender.call{value: amount}("")` 发送 ETH，并在其之后才执行 `balances[msg.sender] -= amount`。
  - 因为余额更新推迟到外部调用之后，攻击者在回调期间的每一次重入都能通过余额检查，从而重复取款。
- 调用流程图（简化）：
  - 用户发起 `attacker.attack()` → 攻击者先 `bank.deposit` → 然后调用 `bank.withdraw` → 银行通过 `call` 回款给攻击者 → 攻击者 `receive()` 触发 → 再次 `bank.withdraw` → 循环直到无法继续。

## 防护方案
- 互斥锁（ReentrancyGuard）：在受保护函数入口设置锁位，函数退出再释放，防止重入。
- 检查-生效-交互（CEI）：先检查条件，立即更新状态，最后再进行外部交互，避免在外部回调期间处于不一致状态。
- 使用 `transfer` 或 `send` 并配合取款拉取模式：将主动推送支付改为“拉取”模型（用户主动来领取且不在同一事务内执行复杂外部逻辑），降低回调风险。

优缺点对比：
- 互斥锁：实现简单，覆盖面广，但可能限制并发或与某些跨合约交互不兼容。
- CEI：设计最佳实践，几乎无额外成本，但需要开发者严格遵守模式。
- 拉取模式：从架构层避免复杂回调，安全性好，但用户体验上不如自动推送支付便利。

修复示例片段（CEI 重排）：
```solidity
function safeWithdraw(uint256 amount) external {
    uint256 available = balances[msg.sender];
    if (available < amount) revert InsufficientBalance(amount, available);
    balances[msg.sender] -= amount; // 先生效
    (bool ok, ) = msg.sender.call{value: amount}(""); // 后交互
    if (!ok) revert TransferFailed();
}
```

## 演示与验证
- 自动化测试：`test/reentrancy.spec.ts`
  - 部署并初始化资金（基线用例验证正常存取）
  - 演示攻击合约触发重入，并记录关键事件与重入次数
  - 验证银行余额下降、攻击者合约获得回款
- 手动前端（可选）：`frontend/index.html`
  - 连接钱包后可手动调用存款、提款与攻击入口进行演示

## 运行步骤
- 安装依赖：`npm i`
- 运行测试：`npx hardhat test test/reentrancy.spec.ts`

提示：由于本项目使用 Hardhat 3 的 EDR 模式，部分链上行为（如递归深度）在不同运行环境可能存在差异。测试脚本通过事件与余额函数读取（合约内视图）进行验证，确保在本环境下稳定演示漏洞影响。

```
