# 挪车通知系统部署指南

本文档提供了挪车通知系统在三个主流部署平台上的详细部署指南：Vercel、Netlify 和 Cloudflare Pages。

## 目录

- [准备工作](#准备工作)
- [Vercel 部署](#vercel-部署)
- [Netlify 部署](#netlify-部署)
- [Cloudflare Pages 部署](#cloudflare-pages-部署)
- [环境变量配置](#环境变量配置)
- [数据库配置](#数据库配置)
- [域名配置](#域名配置)
- [常见问题](#常见问题)

## 准备工作

在开始部署之前，请确保您已完成以下准备工作：

### 1. 代码准备
- 确保代码已提交到 Git 仓库（GitHub、GitLab 或 Bitbucket）
- 代码结构完整，包含所有必要的文件

### 2. 账户准备
- 注册相应平台的账户
- 连接您的 Git 仓库到平台

### 3. 数据库准备
- 准备好数据库连接信息
- 如果使用 SQLite，确保平台支持文件系统写入

## Vercel 部署

### 1. 创建 Vercel 账户
1. 访问 [Vercel 官网](https://vercel.com)
2. 使用 GitHub、GitLab 或 Bitbucket 账户登录
3. 完成账户设置

### 2. 导入项目
1. 点击 "New Project"
2. 选择您的 Git 仓库
3. 点击 "Import"

### 3. 配置构建设置
Vercel 会自动检测 Next.js 项目并配置构建设置：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install"
}
```

### 4. 环境变量配置
在项目设置中添加以下环境变量：

```bash
# 数据库配置
DATABASE_URL="file:./dev.db"

# 应用配置
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="https://your-app.vercel.app"

# 可选：钉钉和企微相关配置
DINGTALK_APP_KEY="your-dingtalk-app-key"
DINGTALK_APP_SECRET="your-dingtalk-app-secret"
```

### 5. 部署
1. 点击 "Deploy" 开始部署
2. 等待构建完成（通常需要 2-5 分钟）
3. 部署成功后，您会获得一个 `.vercel.app` 域名

### 6. 数据库初始化
由于 Vercel 是无服务器环境，您需要：

1. **使用外部数据库**（推荐）：
   - 配置 PostgreSQL 或 MySQL 数据库
   - 更新 `DATABASE_URL` 环境变量

2. **或使用 Vercel KV**：
   ```bash
   # 安装 Vercel KV
   npx vercel kv create
   ```

### 7. 运行数据库迁移
```bash
# 本地运行迁移
npx prisma db push

# 或在 Vercel 中使用 CLI
npx vercel env pull .env.local
npx prisma db push
```

## Netlify 部署

### 1. 创建 Netlify 账户
1. 访问 [Netlify 官网](https://netlify.com)
2. 使用 GitHub、GitLab 或 Bitbucket 账户登录
3. 完成账户设置

### 2. 导入项目
1. 点击 "New site from Git"
2. 选择您的 Git 仓库
3. 点击 "Deploy site"

### 3. 配置构建设置
创建 `netlify.toml` 文件在项目根目录：

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### 4. 环境变量配置
在 Site settings > Environment variables 中添加：

```bash
# 数据库配置
DATABASE_URL="file:./dev.db"

# 应用配置
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="https://your-app.netlify.app"

# 可选：钉钉和企微相关配置
DINGTALK_APP_KEY="your-dingtalk-app-key"
DINGTALK_APP_SECRET="your-dingtalk-app-secret"
```

### 5. 部署
1. 点击 "Deploy site"
2. 等待构建完成
3. 部署成功后，您会获得一个 `.netlify.app` 域名

### 6. 数据库配置
Netlify 推荐使用外部数据库：

1. **连接外部数据库**：
   - 使用 PlanetScale、Supabase 或其他云数据库
   - 更新 `DATABASE_URL` 环境变量

2. **或使用 Netlify Functions** 处理数据库操作

### 7. 运行数据库迁移
```bash
# 本地运行迁移
npx prisma db push

# 确保数据库 schema 与生产环境同步
```

## Cloudflare Pages 部署

### 1. 创建 Cloudflare 账户
1. 访问 [Cloudflare 官网](https://cloudflare.com)
2. 注册账户并登录
3. 进入 Pages 服务

### 2. 导入项目
1. 点击 "Create a project"
2. 选择 "Connect to Git"
3. 选择您的 Git 仓库
4. 授权 Cloudflare 访问您的仓库

### 3. 配置构建设置
在构建设置中配置：

```bash
Build command: npm run build
Build directory: .next
Node.js version: 18
```

创建 `wrangler.toml` 文件：

```toml
name = "your-app-name"
compatibility_date = "2023-12-01"

[env.production]
vars = { NODE_ENV = "production" }

[env.preview]
vars = { NODE_ENV = "development" }
```

### 4. 环境变量配置
在项目设置 > Environment variables 中添加：

```bash
# 数据库配置
DATABASE_URL="file:./dev.db"

# 应用配置
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="https://your-app.pages.dev"

# 可选：钉钉和企微相关配置
DINGTALK_APP_KEY="your-dingtalk-app-key"
DINGTALK_APP_SECRET="your-dingtalk-app-secret"
```

### 5. 部署
1. 点击 "Save and Deploy"
2. 等待构建完成
3. 部署成功后，您会获得一个 `.pages.dev` 域名

### 6. 数据库配置
Cloudflare Pages 推荐使用：

1. **Cloudflare D1**（SQLite 数据库）：
   ```bash
   # 安装 Wrangler CLI
   npm install -g wrangler
   
   # 创建 D1 数据库
   wrangler d1 create挪车数据库
   
   # 获取数据库连接信息
   ```

2. **或连接外部数据库**

### 7. 运行数据库迁移
```bash
# 使用 Wrangler 运行迁移
wrangler d1 execute 挪车数据库 --file=./prisma/schema.sql
```

## 环境变量配置

### 必需环境变量

```bash
# 数据库配置
DATABASE_URL="file:./dev.db"  # 或外部数据库连接字符串

# NextAuth 配置
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="https://your-domain.com"
```

### 可选环境变量

```bash
# 钉钉配置
DINGTALK_APP_KEY="your-dingtalk-app-key"
DINGTALK_APP_SECRET="your-dingtalk-app-secret"

# 企业微信配置
WECHAT_CORP_ID="your-wechat-corp-id"
WECHAT_CORP_SECRET="your-wechat-corp-secret"

# 应用配置
NEXT_PUBLIC_APP_NAME="挪车通知系统"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

## 数据库配置

### SQLite 配置（开发环境）
```bash
# 本地开发
DATABASE_URL="file:./dev.db"

# 生产环境（需要平台支持文件系统）
DATABASE_URL="file:/tmp/dev.db"
```

### PostgreSQL 配置（推荐生产环境）
```bash
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
```

### MySQL 配置
```bash
DATABASE_URL="mysql://username:password@host:port/database"
```

### 数据库迁移步骤

1. **本地生成迁移文件**：
   ```bash
   npx prisma db push
   ```

2. **生产环境运行迁移**：
   ```bash
   # Vercel
   npx vercel env pull .env.local
   npx prisma db push

   # Netlify
   npx netlify env:import
   npx prisma db push

   # Cloudflare
   wrangler d1 execute 数据库名 --file=./prisma/schema.sql
   ```

## 域名配置

### Vercel 域名配置
1. 进入项目设置 > Domains
2. 点击 "Add" 添加自定义域名
3. 配置 DNS 记录：
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### Netlify 域名配置
1. 进入 Site settings > Domain management
2. 点击 "Add custom domain"
3. 配置 DNS 记录：
   ```
   Type: CNAME
   Name: www
   Value: your-site-name.netlify.app
   ```

### Cloudflare Pages 域名配置
1. 进入项目设置 > Custom domains
2. 点击 "Add custom domain"
3. 如果域名在 Cloudflare 管理，会自动配置 DNS

### HTTPS 配置
所有平台都自动提供 HTTPS 证书，无需手动配置。

## 常见问题

### 1. 数据库连接问题

**问题**：部署后数据库连接失败
**解决方案**：
- 检查 `DATABASE_URL` 环境变量是否正确
- 确保数据库服务器允许来自部署平台的连接
- 考虑使用平台推荐的数据库服务

### 2. 构建失败

**问题**：构建过程中出现错误
**解决方案**：
- 检查 Node.js 版本兼容性
- 确保所有依赖都正确安装
- 查看构建日志获取详细错误信息

### 3. 环境变量不生效

**问题**：环境变量在应用中无法读取
**解决方案**：
- 确保变量名拼写正确
- 重新部署应用以应用新的环境变量
- 检查是否需要特定的前缀（如 `NEXT_PUBLIC_`）

### 4. 静态资源问题

**问题**：图片、CSS 等静态资源无法加载
**解决方案**：
- 检查 `next.config.js` 配置
- 确保资源路径正确
- 验证 `public` 目录中的资源是否正确部署

### 5. API 路由问题

**问题**：API 路由返回 404 或 500 错误
**解决方案**：
- 检查 API 路由文件位置是否正确
- 确保导出的是默认导出函数
- 查看服务器日志获取错误详情

## 性能优化建议

### 1. 图片优化
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
}
```

### 2. 缓存配置
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
}
```

### 3. 数据库连接池
```javascript
// lib/db.js
const PrismaClient = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['query'],
  connectionLimit: 10,
})
```

## 监控和日志

### Vercel 监控
- 使用 Vercel Analytics 监控性能
- 查看 Function Logs 调试问题
- 设置错误通知

### Netlify 监控
- 使用 Netlify Analytics
- 查看 Function logs
- 配置 Build notifications

### Cloudflare 监控
- 使用 Cloudflare Analytics
- 查看 Workers Logs
- 配置 Webhook 通知

## 备份和恢复

### 数据库备份
```bash
# SQLite 备份
sqlite3 dev.db ".backup backup.db"

# PostgreSQL 备份
pg_dump your_database > backup.sql

# MySQL 备份
mysqldump your_database > backup.sql
```

### 恢复步骤
1. 下载备份文件
2. 恢复到新数据库
3. 更新环境变量
4. 重新部署应用

---

## 联系支持

如果在部署过程中遇到问题，可以：

1. 查看平台官方文档
2. 访问社区论坛
3. 联系平台技术支持
4. 检查项目 GitHub Issues

希望这份部署指南对您有所帮助！如有任何问题，请随时联系。