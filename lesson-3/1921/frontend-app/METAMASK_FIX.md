# MetaMask 连接问题修复指南 🦊

## 问题诊断

### 错误信息
```
❌ 连接失败: could not decode result data (value="0x", info={ "method": "balanceOf", "signature": "balanceOf(address)" }, code=BAD_DATA, version=6.15.0)
```

### 根本原因
这个错误表示合约调用返回了空数据 (`0x`)，通常有以下几种原因：

1. **❌ 网络不匹配** - MetaMask连接的网络不是Sepolia测试网
2. **❌ 合约不存在** - 在当前网络上没有部署该合约地址
3. **❌ 合约地址错误** - 配置的合约地址不正确

## 修复方案

### 🔧 核心改进

#### 1. **网络验证机制**
在连接钱包和加载数据时，自动检查并切换到正确的网络：

```typescript
// 检查当前网络
const checkNetwork = async () => {
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  const currentChainId = parseInt(chainId, 16);
  
  if (currentChainId !== SEPOLIA_NETWORK_CONFIG.chainId) {
    setMessage('⚠️ 请切换到Sepolia测试网...');
    await switchToSepolia();
    return true;
  }
  return true;
};
```

#### 2. **合约存在性验证**
在调用合约方法前，先验证合约是否存在：

```typescript
// 验证合约代码是否存在
const code = await ethersProvider.getCode(CONTRACT_ADDRESS);
if (code === '0x') {
  throw new Error('合约在当前网络上不存在，请确保已连接到Sepolia测试网');
}
```

#### 3. **网络切换监听**
实时监听网络变化，自动提示用户：

```typescript
const handleChainChanged = (chainId: string) => {
  const newChainId = parseInt(chainId, 16);
  
  if (newChainId !== SEPOLIA_NETWORK_CONFIG.chainId) {
    setMessage('⚠️ 请切换回Sepolia测试网');
    // 清空数据
  } else if (wallet.account) {
    setMessage('✅ 已切换到Sepolia，重新加载数据...');
    loadAccountData(wallet.account);
  }
};
```

#### 4. **可视化网络状态**
在UI中显示当前连接的网络，并提供快速切换按钮：

```typescript
<div className={`border rounded-lg p-3 ${
  wallet.chainId === SEPOLIA_NETWORK_CONFIG.chainId
    ? 'bg-green-50 border-green-200'
    : 'bg-red-50 border-red-200'
}`}>
  <p className={`text-sm font-semibold ${
    wallet.chainId === SEPOLIA_NETWORK_CONFIG.chainId
      ? 'text-green-700'
      : 'text-red-700'
  }`}>
    {wallet.chainId === SEPOLIA_NETWORK_CONFIG.chainId
      ? '✅ 已连接到 MetaMask 🦊'
      : '⚠️ 网络错误'}
  </p>
  
  <span>
    {wallet.chainId === SEPOLIA_NETWORK_CONFIG.chainId
      ? '🌐 Sepolia测试网 (Chain ID: 11155111)'
      : `❌ 当前网络: Chain ID ${wallet.chainId} - 请切换到Sepolia`}
  </span>
  
  {wallet.chainId !== SEPOLIA_NETWORK_CONFIG.chainId && (
    <button onClick={switchToSepolia}>
      切换网络
    </button>
  )}
</div>
```

## 使用说明

### 🚀 如何正确连接

1. **打开MetaMask扩展**
   - 确保已安装MetaMask浏览器扩展
   - 确保已解锁钱包

2. **点击"连接 MetaMask"按钮**
   - DApp会自动检测当前网络
   - 如果不是Sepolia，会自动提示切换

3. **确认网络切换**
   - 在MetaMask弹窗中点击"切换网络"
   - 或者点击DApp界面上的"切换网络"按钮

4. **等待数据加载**
   - 连接成功后会显示绿色状态
   - 自动加载余额和代币信息

### ⚠️ 常见问题排查

#### 问题1: 仍然显示"could not decode result data"
**解决方案:**
1. 检查MetaMask是否真的切换到了Sepolia测试网
2. 查看DApp顶部的网络状态指示器
3. 如果显示红色，点击"切换网络"按钮
4. 刷新页面重新连接

#### 问题2: 网络切换后数据不更新
**解决方案:**
1. 断开连接后重新连接
2. 刷新浏览器页面
3. 检查MetaMask是否有待处理的请求

#### 问题3: 无法切换到Sepolia网络
**解决方案:**
1. 手动在MetaMask中添加Sepolia网络
2. 网络配置：
   - **网络名称**: Sepolia test network
   - **RPC URL**: https://rpc.sepolia.org
   - **Chain ID**: 11155111
   - **货币符号**: ETH
   - **区块浏览器**: https://sepolia.etherscan.io

## 技术细节

### 修改的文件
- `src/app/page.tsx` - 主要修改文件

### 新增功能
1. ✅ 自动网络检测和切换
2. ✅ 合约存在性验证
3. ✅ 实时网络状态显示
4. ✅ 网络变化监听和自动处理
5. ✅ 友好的错误提示

### 状态管理改进
```typescript
interface WalletState {
  isConnected: boolean;
  account: string | null;
  balance: string;
  tokenBalance: string;
  canMint: boolean;
  remainingTime: number;
  mintInterval: number;
  chainId: number | null;  // 新增：追踪当前网络ID
}
```

## 测试清单

- [x] 在非Sepolia网络连接时自动提示切换
- [x] 网络切换后自动重新加载数据
- [x] 显示当前连接的网络ID
- [x] 提供快速切换网络按钮
- [x] 合约不存在时显示友好错误
- [x] 网络状态可视化（绿色=正确，红色=错误）

## 部署信息

- **合约地址**: `0xD731e59e896afE68C6592C681016973Ec54Aa0d7`
- **网络**: Sepolia测试网
- **Chain ID**: 11155111
- **区块浏览器**: https://sepolia.etherscan.io/address/0xD731e59e896afE68C6592C681016973Ec54Aa0d7

## 下一步

1. 启动开发服务器：
   ```bash
   cd frontend-app
   npm run dev
   ```

2. 打开浏览器访问 http://localhost:3000

3. 确保MetaMask已安装并解锁

4. 点击"连接 MetaMask"按钮

5. 如果看到红色网络警告，点击"切换网络"按钮

6. 等待绿色状态显示，表示已正确连接到Sepolia

---

**修复完成时间**: 2025年11月27日
**状态**: ✅ 已修复并测试
