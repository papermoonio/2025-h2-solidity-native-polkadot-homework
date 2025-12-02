# 🚀 部署指南 - 修复线上连接问题

## ⚠️ 常见问题

### 问题：线上部署后无法连接钱包

**症状：**
```
installHook.js:1 连接失败: Object
```

**原因：**
1. Next.js 静态导出模式的限制
2. Cloudflare Pages 的环境差异
3. 钱包扩展的跨域限制

---

## ✅ 解决方案

### 方案 1：使用 Vercel 部署（推荐）

Vercel 对 Next.js 支持最好，不需要静态导出。

#### 步骤：

1. **安装 Vercel CLI**
```bash
npm i -g vercel
```

2. **登录 Vercel**
```bash
vercel login
```

3. **部署**
```bash
cd /Users/linkunkun/Documents/web3/2025-h2-solidity-native-polkadot-homework/lesson-3/1921/frontend-app
vercel
```

4. **生产部署**
```bash
vercel --prod
```

#### 优点：
- ✅ 完美支持 Next.js
- ✅ 自动 HTTPS
- ✅ 全球 CDN
- ✅ 无需配置

---

### 方案 2：修改 Cloudflare Pages 配置

如果必须使用 Cloudflare Pages：

#### 1. 修改 `next.config.ts`

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 移除 output: 'export'，使用 SSR 模式
  images: {
    unoptimized: true,
  },
}

export default nextConfig
```

#### 2. 添加 Cloudflare 适配器

```bash
npm install @cloudflare/next-on-pages
```

#### 3. 更新构建命令

在 Cloudflare Pages 设置中：
- **构建命令**: `npx @cloudflare/next-on-pages`
- **输出目录**: `.vercel/output/static`

---

### 方案 3：使用 Netlify

Netlify 也对 Next.js 有很好的支持。

#### 步骤：

1. **安装 Netlify CLI**
```bash
npm i -g netlify-cli
```

2. **登录**
```bash
netlify login
```

3. **部署**
```bash
netlify deploy --prod
```

---

## 🔍 调试技巧

### 1. 查看浏览器控制台

打开开发者工具（F12），查看详细错误信息：

```javascript
// 应该看到这些日志
1. 开始连接钱包...
2. 检查 window.ethereum: true
3. 请求账户授权...
```

### 2. 检查钱包是否安装

```javascript
console.log('钱包检测:', {
  hasEthereum: !!window.ethereum,
  isMetaMask: window.ethereum?.isMetaMask,
  isRabby: window.ethereum?.isRabby
});
```

### 3. 测试本地环境

```bash
# 本地测试
npm run dev

# 本地构建测试
npm run build
npm run start
```

---

## 📝 推荐部署流程

### 最佳实践：

1. **本地测试** ✅
```bash
npm run dev
# 测试所有功能
```

2. **构建测试** ✅
```bash
npm run build
npm run start
# 确保构建版本正常
```

3. **部署到 Vercel** ✅
```bash
vercel --prod
```

4. **验证线上版本** ✅
- 打开部署的 URL
- 测试连接钱包
- 测试铸造功能
- 检查控制台日志

---

## 🎯 当前状态

**已优化：**
- ✅ 添加详细的连接日志
- ✅ 改进错误处理
- ✅ 添加浏览器环境检查
- ✅ 优化错误提示信息

**下一步：**
1. 重新部署到 Cloudflare Pages
2. 或者切换到 Vercel 部署
3. 测试线上连接功能

---

## 💡 快速修复

如果你现在就想修复，最快的方法：

```bash
# 1. 安装 Vercel
npm i -g vercel

# 2. 部署
cd frontend-app
vercel --prod

# 3. 完成！
```

部署完成后，Vercel 会给你一个 URL，直接访问测试即可。

---

## 📞 需要帮助？

如果还有问题，请提供：
1. 浏览器控制台的完整错误信息
2. 使用的部署平台
3. 钱包类型（MetaMask/Rabby）

我会帮你进一步排查！
