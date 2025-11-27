# Reentrancy Attack

**课程作业 / 安全实验报告** · 以太坊智能合约经典漏洞复现  
**严禁部署到任何公共测试网或主网，仅限本地教学使用**

## 漏洞原理

重入攻击是智能合约中最经典、最致命的漏洞之一（2016 年 The DAO 事件导致 5000+ 万美元损失）。

核心问题：**外部调用前未更新状态**，导致攻击者在收到 ETH 时通过 `receive()` / `fallback()` 再次调用同一函数，形成递归提款。

```solidity
// 错误写法（存在重入漏洞）
(bool success, ) = msg.sender.call{value: amount}("");
require(success);
balances[msg.sender] -= amount;
```
太晚了！已经被重入了


## 目录结构
```
├── contracts/
│   ├── VictimContract.sol          ← 存在重入漏洞的银行合约
│   └── Attacker.sol        ← 攻击合约（含 payable receive）
├── test/
│   └── ReentrancyAttack.ts ← Hardhat 测试脚本
├── screenshots/            ← 运行成功截图
├── hardhat.config.ts
└── README.md               ← 你现在看到的这份文件
```
## 核心代码展示
Victim.sol（漏洞合约）
```solidity
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount, "Insufficient balance");

    // 漏洞：先转账，后减余额 → 重入窗口
    (bool sent, ) = msg.sender.call{value: amount}("");
    require(sent, "Transfer failed");

    balances[msg.sender] -= amount;
}
```
## 演示
```
 Bank before attack: 10.0 ETH
 Bank after attack:  0.0 ETH     ← 被完全抽干！
 Attacker balance:   10.92 ETH    ← 成功获利

  Reentrancy Attack Demo
    ✔ 应该成功执行重入攻击，将银行合约抽干 (1247ms)

  1 passing (1.3s)
```


