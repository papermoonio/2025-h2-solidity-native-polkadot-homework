# 🚀 快速部署指南 - 三种方案

## 方案一：Cloudflare Pages（推荐 - 免费 + 快速）

### 📦 使用 Wrangler CLI 直接部署

```bash
# 1. 进入前端目录
cd /Users/linkunkun/Documents/web3/2025-h2-solidity-native-polkadot-homework/lesson-3/1921/frontend-app

# 2. 安装依赖（如果还没安装）
npm install

# 3. 构建项目
npm run build

# 4. 安装 Wrangler（如果还没安装）
npm install -g wrangler

# 5. 登录 Cloudflare
wrangler login

# 6. 部署到 Cloudflare Pages
wrangler pages deploy out --project-name=mintable-erc20-dapp-1921

# 完成！你会得到一个 https://mintable-erc20-dapp-1921.pages.dev 的链接
```

**优点：**
- ✅ 完全免费
- ✅ 全球 CDN 加速
- ✅ 自动 HTTPS
- ✅ 无限带宽
- ✅ 一条命令部署

---

## 方案二：Vercel（最流行 - 适合 Next.js）

### 📦 使用 Vercel CLI 部署

```bash
# 1. 进入前端目录
cd /Users/linkunkun/Documents/web3/2025-h2-solidity-native-polkadot-homework/lesson-3/1921/frontend-app

# 2. 安装 Vercel CLI
npm install -g vercel

# 3. 登录并部署
vercel

# 按照提示操作：
# - Set up and deploy? Yes
# - Which scope? 选择你的账户
# - Link to existing project? No
# - What's your project's name? mintable-erc20-dapp-1921
# - In which directory is your code located? ./
# - Want to override the settings? No

# 4. 部署到生产环境
vercel --prod

# 完成！你会得到一个 https://mintable-erc20-dapp-1921.vercel.app 的链接
```

**优点：**
- ✅ 专为 Next.js 优化
- ✅ 自动 CI/CD
- ✅ 预览部署
- ✅ 分析工具

---

## 方案三：GitHub Pages（完全免费）

### 📦 部署到 GitHub Pages

```bash
# 1. 进入项目根目录
cd /Users/linkunkun/Documents/web3/2025-h2-solidity-native-polkadot-homework

# 2. 确保代码已提交
git add .
git commit -m "准备部署前端应用"

# 3. 推送到 GitHub
git push origin main

# 4. 进入前端目录
cd lesson-3/1921/frontend-app

# 5. 安装 gh-pages
npm install --save-dev gh-pages

# 6. 在 package.json 添加部署脚本
# 手动添加以下内容到 scripts:
# "deploy": "next build && touch out/.nojekyll && gh-pages -d out -t true"

# 7. 构建并部署
npm run deploy

# 8. 在 GitHub 仓库设置中启用 GitHub Pages
# Settings > Pages > Source: gh-pages branch
```

**注意：** 需要修改 `next.config.ts` 添加 basePath：

```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/2025-h2-solidity-native-polkadot-homework', // 你的仓库名
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
}
```

**优点：**
- ✅ 完全免费
- ✅ 与 GitHub 集成
- ✅ 简单直接

---

## 🎯 推荐选择

### 如果你想要最快部署：
**选择方案一（Cloudflare Pages）** - 只需 6 个命令

### 如果你想要最佳 Next.js 体验：
**选择方案二（Vercel）** - Next.js 官方推荐

### 如果你想要完全免费且简单：
**选择方案三（GitHub Pages）** - 但需要配置 basePath

---

## 🔧 部署前检查清单

- [x] `next.config.ts` 已配置 `output: 'export'`
- [x] `wrangler.toml` 已配置（Cloudflare）
- [x] 合约地址正确：`0xD731e59e896afE68C6592C681016973Ec54Aa0d7`
- [x] 网络配置正确：Sepolia (Chain ID: 11155111)
- [ ] 已安装部署工具（wrangler/vercel/gh-pages）
- [ ] 已构建项目（`npm run build`）

---

## 🎉 部署后测试

访问你的部署 URL，测试以下功能：

1. ✅ 页面正常加载
2. ✅ 连接 MetaMask
3. ✅ 自动切换到 Sepolia 网络
4. ✅ 显示余额
5. ✅ 铸造代币
6. ✅ 倒计时功能

---

## 🆘 遇到问题？

### Cloudflare Pages 部署失败
```bash
# 检查构建输出
ls -la out/

# 重新构建
npm run build

# 重新部署
wrangler pages deploy out --project-name=mintable-erc20-dapp-1921
```

### Vercel 部署失败
```bash
# 查看日志
vercel logs

# 重新部署
vercel --prod --force
```

### GitHub Pages 404 错误
- 检查 basePath 配置
- 确保 `.nojekyll` 文件存在
- 等待 5-10 分钟让 GitHub 处理

---

**选择一个方案开始部署吧！** 🚀
