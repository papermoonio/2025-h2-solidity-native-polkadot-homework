# 重入攻击演示

## 漏洞描述

重入攻击是智能合约中最著名的漏洞之一。该漏洞发生在合约在执行外部调用之前没有完成其内部状态更新的情况下。

### 漏洞原理

在 `VulnerableBank.sol` 中，`withdraw` 函数的执行顺序是：
1. 检查用户余额
2. 向用户发送ETH（外部调用）
3. 更新用户余额为0

问题出现在第2步：当合约向攻击者发送ETH时，会触发攻击者合约的 `receive` 或 `fallback` 函数。攻击者可以在这个函数中再次调用银行的 `withdraw` 函数，而此时银行的余额记录还没有被更新（第3步尚未执行），因此攻击者可以重复取款，直到耗尽合约资金。

### 攻击步骤

1. 攻击者向有漏洞的银行存入1 ETH
2. 攻击者调用 `withdraw` 函数
3. 银行检查余额为1 ETH，然后向攻击者发送1 ETH
4. 发送ETH触发攻击者合约的 `receive` 函数
5. 在 `receive` 函数中，攻击者再次调用银行的 `withdraw` 函数
6. 银行再次检查余额（此时余额记录仍是1 ETH，因为还没有更新）
7. 重复步骤3-6，直到银行资金被耗尽
8. 最后银行才更新余额记录（但为时已晚）

### 修复方法

1. **检查-效果-交互模式**：先完成所有内部状态更新，再进行外部调用
2. **使用重入锁**：使用如OpenZeppelin的ReentrancyGuard
3. **限制Gas**：使用 `transfer` 或 `send` 而不是 `call`（但在新版本中不推荐）

修复后的安全代码：
```solidity
function withdrawSafe() public {
    uint amount = balances[msg.sender];
    require(amount > 0, "Insufficient balance");
    
    // 先更新余额
    balances[msg.sender] = 0;
    
    // 再进行外部调用
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
    
    emit Withdraw(msg.sender, amount);
}