# 部署到 Cloudflare Pages 指南 🚀

本指南将帮助你将 MintableERC20 前端应用部署到 Cloudflare Pages。

## 📋 前置要求

- [Cloudflare 账号](https://dash.cloudflare.com/sign-up)（免费）
- GitHub 仓库（你的项目代码）
- Git 已安装并配置

## 🌟 方法一：通过 Cloudflare Dashboard 部署（推荐）

### 步骤 1: 推送代码到 GitHub

```bash
# 确保你在项目根目录
cd /Users/linkunkun/Documents/web3/2025-h2-solidity-native-polkadot-homework/lesson-3/1921

# 如果还没有 git 仓库，初始化一个
git init
git add .
git commit -m "准备部署到 Cloudflare Pages"

# 推送到 GitHub（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

### 步骤 2: 连接 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 在左侧菜单选择 **Pages**
3. 点击 **Create a project**
4. 点击 **Connect to Git**
5. 授权 Cloudflare 访问你的 GitHub 账户
6. 选择你的仓库

### 步骤 3: 配置构建设置

在构建配置页面填写以下信息：

- **项目名称**: `mintable-erc20-dapp`（或你喜欢的名称）
- **生产分支**: `main`
- **框架预设**: `Next.js (Static HTML Export)`
- **构建命令**: `npm run build`
- **构建输出目录**: `out`
- **根目录**: `lesson-3/1921/frontend-app`

### 步骤 4: 部署

1. 点击 **Save and Deploy**
2. 等待构建完成（通常 2-5 分钟）
3. 部署成功后，你会获得一个 `.pages.dev` 域名

## 🔧 方法二：使用 Wrangler CLI 部署

### 安装 Wrangler

```bash
npm install -g wrangler
```

### 登录 Cloudflare

```bash
wrangler login
```

### 构建项目

```bash
cd frontend-app
npm install
npm run build
```

### 部署

```bash
wrangler pages deploy out --project-name=mintable-erc20-dapp
```

## 🎯 部署后的配置

### 1. 自定义域名（可选）

1. 在 Cloudflare Pages 项目设置中
2. 点击 **Custom domains**
3. 添加你的域名
4. 按照提示配置 DNS

### 2. 环境变量（如需要）

如果你的应用使用环境变量：

1. 在项目设置中选择 **Settings** > **Environment variables**
2. 添加你的环境变量
3. 重新部署

## 📊 验证部署

访问你的部署 URL，检查以下功能：

- ✅ MetaMask 连接功能
- ✅ 合约交互（铸造代币）
- ✅ 余额显示
- ✅ 倒计时功能
- ✅ Sepolia 测试网连接

## 🔍 常见问题

### Q: 部署失败怎么办？

**A:** 检查以下几点：
- 构建输出目录是否正确（应该是 `out`）
- `next.config.ts` 是否已配置 `output: 'export'`
- 是否有使用不支持静态导出的 Next.js 功能（如 API Routes）

### Q: 页面显示 404？

**A:** 确保：
- 构建输出目录设置为 `out`
- `trailingSlash: true` 已在 next.config.ts 中配置

### Q: MetaMask 连接不工作？

**A:** 检查：
- HTTPS 是否启用（Cloudflare Pages 默认启用）
- 浏览器控制台是否有错误
- 合约地址是否正确

## 🚀 自动部署

Cloudflare Pages 支持自动部署：

- 推送到 `main` 分支会自动触发生产部署
- 推送到其他分支会创建预览部署
- 每个 Pull Request 会生成预览链接

## 📈 性能优化建议

1. **启用 Cloudflare CDN** - 自动启用，全球加速
2. **配置缓存规则** - 在 Cloudflare 设置中优化缓存
3. **压缩资源** - Cloudflare 自动压缩 HTML/CSS/JS
4. **使用 Web Workers** - 利用 Cloudflare 的边缘计算

## 🔗 有用的链接

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Next.js 静态导出文档](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Sepolia 测试网 Faucet](https://sepoliafaucet.com/)
- [合约地址](https://sepolia.etherscan.io/address/0xD731e59e896afE68C6592C681016973Ec54Aa0d7)

## 📝 部署清单

- [ ] 代码推送到 GitHub
- [ ] 在 Cloudflare Pages 创建项目
- [ ] 配置正确的构建设置
- [ ] 等待首次部署完成
- [ ] 测试 MetaMask 连接
- [ ] 测试代币铸造功能
- [ ] （可选）配置自定义域名
- [ ] 分享你的 DApp URL！

---

**部署成功后，你的 DApp 将在全球范围内快速访问！** 🎉
