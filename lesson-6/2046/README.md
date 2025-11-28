# 重入攻击漏洞演示

## 漏洞说明

### 漏洞类型
这是一个典型的**重入攻击（Reentrancy Attack）**漏洞。重入攻击发生在智能合约中，当合约在发送以太币（或调用外部合约）之前更新状态时，攻击者可以在回调中再次调用原始函数，从而导致意外的行为。

### 漏洞合约分析
在 `VulnerableBank.sol` 中，`withdraw` 函数的执行顺序如下：
1. 检查用户余额是否足够。
2. 发送以太币给用户（`msg.sender.call{value: amount}("")`）。
3. 更新用户余额（`balances[msg.sender] -= amount`）。

问题在于：在发送以太币之后、更新余额之前，攻击者可以通过回退函数（`receive` 或 `fallback`）再次调用 `withdraw` 函数，从而多次提取资金。

### 攻击合约分析
`ReentrancyAttack.sol` 通过以下步骤利用漏洞：
1. 调用 `attack` 函数并存入 1 ETH。
2. 调用 `withdraw` 函数，触发重入：
   - 银行合约发送 1 ETH 到攻击合约。
   - 攻击合约的 `receive` 函数被调用，再次调用 `withdraw`。
   - 重复此过程，直到银行合约的资金被耗尽。
3. 攻击完成后，调用 `withdraw` 函数取回攻击合约中的资金。

## 修复建议
修复方法是使用“检查-效果-交互”（Checks-Effects-Interactions）模式：
1. 先更新状态（`balances[msg.sender] -= amount`）。
2. 再发送以太币（`msg.sender.call{value: amount}("")`）。

修复后的 `withdraw` 函数：
```solidity
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    balances[msg.sender] -= amount; // 先更新状态
    (bool success, ) = msg.sender.call{value: amount}(""); // 再发送以太币
    require(success, "Transfer failed");
}