import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 生产环境优化
  compress: true,
  poweredByHeader: false,
  
  // 图片优化
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  
  // 构建优化
  generateBuildId: async () => {
    return 'scan-move-car-' + Date.now()
  },
  
  // 实验性功能
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-*']
  },
  
  // 环境特定配置
  ...(process.env.NODE_ENV === 'production' && {
    output: 'standalone',
    distDir: '.next'
  }),
  
  // TypeScript 和 ESLint 配置
  typescript: {
    ignoreBuildErrors: false,
  },
  
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // webpack 优化
  webpack: (config, { dev, isServer }) => {
    // 生产环境优化
    if (!dev && !isServer) {
      Object.assign(config.resolve.alias, {
        'react/jsx-runtime.js': 'react/jsx-runtime',
        'react/jsx-dev-runtime.js': 'react/jsx-dev-runtime',
      });
    }
    
    // 优化构建性能
    if (dev) {
      config.watchOptions = {
        ignored: /node_modules/,
      };
    }
    
    return config;
  },
};

export default nextConfig;
