#!/bin/bash

# 🚀 MintableERC20 DApp 一键部署脚本
# 支持 Cloudflare Pages 和 Vercel

set -e  # 遇到错误立即退出

echo "🚀 MintableERC20 DApp 部署脚本"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误: 请在 frontend-app 目录下运行此脚本${NC}"
    exit 1
fi

echo -e "${BLUE}📦 步骤 1/4: 安装依赖...${NC}"
npm install

echo ""
echo -e "${BLUE}🔨 步骤 2/4: 构建项目...${NC}"
npm run build

# 检查构建是否成功
if [ ! -d "out" ]; then
    echo -e "${RED}❌ 构建失败: out 目录不存在${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ 构建成功！${NC}"
echo ""

# 选择部署平台
echo -e "${YELLOW}请选择部署平台:${NC}"
echo "1) Cloudflare Pages (推荐 - 免费 + 快速)"
echo "2) Vercel (Next.js 官方推荐)"
echo "3) 仅构建，不部署"
echo ""
read -p "请输入选项 (1-3): " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}🌐 步骤 3/4: 部署到 Cloudflare Pages...${NC}"
        
        # 检查 wrangler 是否安装
        if ! command -v wrangler &> /dev/null; then
            echo -e "${YELLOW}⚠️  Wrangler 未安装，正在安装...${NC}"
            npm install -g wrangler
        fi
        
        # 检查是否已登录
        if ! wrangler whoami &> /dev/null; then
            echo -e "${YELLOW}🔐 请登录 Cloudflare...${NC}"
            wrangler login
        fi
        
        echo ""
        echo -e "${BLUE}🚀 步骤 4/4: 正在部署...${NC}"
        wrangler pages deploy out --project-name=mintable-erc20-dapp-1921
        
        echo ""
        echo -e "${GREEN}🎉 部署成功！${NC}"
        echo -e "${GREEN}📱 你的 DApp 已上线: https://mintable-erc20-dapp-1921.pages.dev${NC}"
        ;;
        
    2)
        echo ""
        echo -e "${BLUE}🌐 步骤 3/4: 部署到 Vercel...${NC}"
        
        # 检查 vercel 是否安装
        if ! command -v vercel &> /dev/null; then
            echo -e "${YELLOW}⚠️  Vercel CLI 未安装，正在安装...${NC}"
            npm install -g vercel
        fi
        
        echo ""
        echo -e "${BLUE}🚀 步骤 4/4: 正在部署...${NC}"
        vercel --prod
        
        echo ""
        echo -e "${GREEN}🎉 部署成功！${NC}"
        ;;
        
    3)
        echo ""
        echo -e "${GREEN}✅ 构建完成！${NC}"
        echo -e "${BLUE}📁 构建输出目录: ./out${NC}"
        echo ""
        echo "你可以手动部署 out 目录到任何静态托管服务："
        echo "  - Cloudflare Pages: wrangler pages deploy out"
        echo "  - Vercel: vercel --prod"
        echo "  - Netlify: netlify deploy --prod --dir=out"
        exit 0
        ;;
        
    *)
        echo -e "${RED}❌ 无效选项${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${YELLOW}📋 部署后检查清单:${NC}"
echo "  ✓ 访问你的 DApp URL"
echo "  ✓ 测试 MetaMask 连接"
echo "  ✓ 确认网络切换到 Sepolia"
echo "  ✓ 测试代币铸造功能"
echo ""
echo -e "${BLUE}🔗 有用的链接:${NC}"
echo "  📝 合约地址: 0xD731e59e896afE68C6592C681016973Ec54Aa0d7"
echo "  🌐 区块浏览器: https://sepolia.etherscan.io/address/0xD731e59e896afE68C6592C681016973Ec54Aa0d7"
echo "  💧 Sepolia Faucet: https://sepoliafaucet.com/"
echo ""
echo -e "${GREEN}🎊 恭喜！你的 Web3 DApp 已成功部署！${NC}"
