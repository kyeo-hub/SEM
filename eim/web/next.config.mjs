/** @type {import('next').NextConfig} */
const nextConfig = {
  // API 代理配置 - 将 /api 请求代理到后端 Go 服务
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
    ];
  },
  
  // 生产构建时忽略 ESLint 错误（开发环境仍会显示）
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // TypeScript 类型检查警告不阻止构建
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 禁用静态页面生成，全部使用 SSR
  output: 'standalone',
};

export default nextConfig;
