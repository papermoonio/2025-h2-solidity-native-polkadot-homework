import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  output: 'out',// 启用静态导出模式
  images: {
    unoptimized: true, // Cloudflare Pages 需要禁用图片优化
  },
  trailingSlash: true, // 添加尾部斜杠以兼容静态托管
}

export default nextConfig
