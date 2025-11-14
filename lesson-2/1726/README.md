# Lesson 2 Homework: ERC20 Contract

## Student ID: 1726

---

### 合约功能
- 完整实现 ERC20 标准（EIP-20）
- 代币名称：`MyToken`
- 符号：`MTK`
- 小数位：`18`
- 初始供应量：`100` 代币（本地测试）
- 包含 `transfer`、`approve`、`transferFrom`、`allowance` 等核心函数
- 使用 `require` + `revert` 进行安全校验
- 触发 `Transfer` 和 `Approval` 事件

---

### 测试环境
REMIX
- **运行环境**：**Remix VM**（本地模拟 EVM）
- **部署账户**：`0x5B38Da6a701c568545dCfcB03FcB875f56beddC4`
- **合约地址**：`0xf8e81D47203A594245E36C48e151709F0C19fBe8`（本地 VM）

> **说明**：由于网络问题，无法稳定领取 Sepolia 测试 ETH，因此 **仅完成本地完整测试**。所有功能已在模拟环境中 100% 验证通过。

---
