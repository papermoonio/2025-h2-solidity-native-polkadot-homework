# 🔧 多钱包冲突修复指南

## ⚠️ 问题描述

**错误信息：**
```
Uncaught TypeError: Cannot set property ethereum of #<Window> which has only a getter
连接失败: Object
```

**原因：**
多个钱包扩展（MetaMask、Rabby、Coinbase Wallet 等）同时注入 `window.ethereum`，导致冲突。

---

## ✅ 解决方案

### 方案 1：只保留一个钱包（最简单）

#### Chrome/Edge：
1. 打开 `chrome://extensions/`
2. 找到所有钱包扩展
3. **只启用一个**，禁用其他
4. 刷新 DApp 页面

#### 推荐配置：
- ✅ **只启用 Rabby**（推荐，体验更好）
- 或 ✅ **只启用 MetaMask**

---

### 方案 2：使用 Rabby 的独占模式

Rabby 有一个功能可以避免冲突：

1. 打开 Rabby 钱包
2. 点击右上角设置 ⚙️
3. 找到 "开发者选项"
4. 启用 "独占模式" 或 "优先注入"
5. 刷新页面

---

### 方案 3：手动选择钱包

如果必须保留多个钱包，可以这样做：

#### 使用 MetaMask：
```javascript
// 在浏览器控制台运行
window.ethereum = window.ethereum.providers?.find(p => p.isMetaMask) || window.ethereum;
```

#### 使用 Rabby：
```javascript
// 在浏览器控制台运行
window.ethereum = window.ethereum.providers?.find(p => p.isRabby) || window.ethereum;
```

然后刷新页面。

---

## 🔍 检测当前钱包

在浏览器控制台运行：

```javascript
console.log('钱包检测:', {
  hasEthereum: !!window.ethereum,
  isMetaMask: window.ethereum?.isMetaMask,
  isRabby: window.ethereum?.isRabby,
  isCoinbaseWallet: window.ethereum?.isCoinbaseWallet,
  providers: window.ethereum?.providers?.map(p => ({
    isMetaMask: p.isMetaMask,
    isRabby: p.isRabby
  }))
});
```

---

## 📊 推荐配置

### 对于开发者：
```
✅ Rabby（主钱包）
❌ MetaMask（禁用）
❌ Coinbase Wallet（禁用）
❌ 其他钱包（禁用）
```

### 对于普通用户：
```
✅ MetaMask（主钱包）
❌ 其他钱包（禁用）
```

---

## 🚀 快速修复步骤

1. **关闭所有浏览器标签页**
2. **打开扩展管理** (`chrome://extensions/`)
3. **禁用除 Rabby 外的所有钱包**
4. **重新打开 DApp**
5. **点击连接钱包**

应该就能正常工作了！

---

## 💡 为什么会有这个问题？

**技术原因：**
- 每个钱包扩展都想成为 `window.ethereum` 的提供者
- 多个扩展同时注入会导致冲突
- Rabby 和 MetaMask 的注入机制不同

**解决思路：**
- 只保留一个钱包（最简单）
- 或使用钱包的独占模式
- 或在代码中处理多钱包选择

---

## 🎯 已优化的代码

最新代码已经添加了：
- ✅ 钱包注入延迟等待
- ✅ 详细的钱包检测日志
- ✅ 多钱包环境识别

但最好的解决方案还是：**只启用一个钱包扩展**。

---

## 📞 仍然有问题？

如果按照上述步骤还是不行：

1. **完全卸载所有钱包扩展**
2. **重启浏览器**
3. **只安装 Rabby**
4. **重新测试**

这样可以确保干净的环境。
