# 扫码挪车系统快速部署指南

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <your-repo-url>
cd scan-move-car

# 安装依赖
npm install

# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

### 2. 配置环境变量

在 `.env` 文件中设置以下必需变量：

```bash
# 数据库配置
DATABASE_URL="file:./dev.db"  # SQLite (开发环境)
# DATABASE_URL="postgresql://username:password@host:port/database"  # PostgreSQL (生产环境)

# Redis 配置
REDIS_URL="redis://localhost:6379"  # 本地 Redis
# REDIS_URL="rediss://username:password@host:port"  # Upstash Redis (生产环境)

# 应用配置
NODE_ENV="production"
```

### 3. 数据库初始化

```bash
# 生成 Prisma 客户端
npm run db:generate

# 推送数据库 schema
npm run db:push
```

### 4. 构建项目

```bash
# 构建项目
npm run build

# 检查构建结果
npm run lint
```

## 📦 部署到云平台

### Vercel 部署（推荐）

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login

# 部署到 Vercel
npm run deploy:vercel
```

### Netlify 部署

```bash
# 安装 Netlify CLI
npm install -g netlify-cli

# 登录 Netlify
netlify login

# 部署到 Netlify
npm run deploy:netlify
```

### Cloudflare 部署

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 部署到 Cloudflare
npm run deploy:cloudflare
```

### 一键部署到所有平台

```bash
# 部署到所有平台
npm run deploy:all
```

## 🔧 检查部署状态

```bash
# 检查环境变量配置
npm run deploy:check

# 测试应用
npm start
```

## 📋 部署清单

- [ ] 环境变量已配置
- [ ] 数据库已初始化
- [ ] 项目构建成功
- [ ] 代码已提交到 Git
- [ ] 选择部署平台
- [ ] 部署脚本执行成功
- [ ] 应用在线可访问

## 🎯 推荐的免费服务

### 数据库
- **Supabase**: 免费的 PostgreSQL 数据库
- **Neon**: Serverless PostgreSQL，免费额度
- **PlanetScale**: 兼容 MySQL，免费计划

### Redis
- **Upstash Redis**: 免费的 Redis 服务
- **Redis Labs**: 免费额度

### 监控
- **Vercel Analytics**: 内置分析
- **Netlify Analytics**: 网站分析
- **Cloudflare Analytics**: 性能监控

## 🚨 故障排除

### 常见问题

1. **环境变量缺失**
   ```bash
   npm run deploy:check
   ```

2. **构建失败**
   ```bash
   npm run lint
   npm run build
   ```

3. **数据库连接失败**
   ```bash
   npm run db:push
   ```

### 获取帮助

- 查看 `DEPLOYMENT.md` 获取详细文档
- 检查各个平台的官方文档
- 查看项目 issues 和 discussions

## 🎉 完成！

恭喜！你的扫码挪车系统已经成功部署到云端。现在你可以：

1. 访问你的应用 URL
2. 测试所有功能
3. 配置域名和 SSL
4. 设置监控和告警

开始使用你的扫码挪车系统吧！🚗