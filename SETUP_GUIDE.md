# 🚀 Move Car DB 快速设置指南

## 📋 系统要求

- Node.js 18+ 
- npm 或 yarn
- SQLite (开发环境) 或 PostgreSQL/MySQL (生产环境)

## 🔧 快速启动

### 方法一：自动初始化（推荐）
```bash
# 1. 安装依赖
npm install

# 2. 生成数据库
npm run db:generate
npm run db:push

# 3. 启动开发服务器（自动初始化）
npm run dev
```

### 方法二：手动初始化
```bash
# 1. 安装依赖
npm install

# 2. 生成数据库
npm run db:generate
npm run db:push

# 3. 手动初始化系统
npm run init-system

# 4. 启动开发服务器
npm run dev
```

## 🎯 访问系统

启动成功后：
- **前端地址**: http://localhost:3000
- **管理员账户**: 
  - 用户名: `admin`
  - 密码: `admin123`

## 🔐 首次登录

1. 访问 http://localhost:3000
2. 使用管理员账户登录 (`admin` / `admin123`)
3. **立即修改密码**（重要！）
4. 配置系统设置

## 📚 可用命令

### 开发命令
```bash
npm run dev          # 启动开发服务器（自动初始化）
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 代码检查
```

### 数据库命令
```bash
npm run db:generate  # 生成Prisma客户端
npm run db:push      # 推送数据库结构
npm run db:migrate   # 运行数据库迁移
npm run db:reset     # 重置数据库
```

### 系统管理命令
```bash
npm run init-system     # 完整系统初始化
npm run create-admin    # 仅创建管理员账户（旧版）
npm run init-system-config  # 仅初始化系统配置（旧版）
```

### 部署命令
```bash
npm run deploy:vercel      # 部署到Vercel
npm run deploy:netlify     # 部署到Netlify
npm run deploy:cloudflare  # 部署到Cloudflare
npm run deploy:all         # 部署到所有平台
npm run deploy:check       # 检查部署状态
```

## 🔧 系统配置

系统启动时会自动创建以下默认配置：

| 配置项 | 默认值 | 说明 |
|-------|--------|------|
| `ALLOW_REGISTRATION` | `true` | 是否允许用户注册 |
| `SITE_NAME` | `Move Car DB` | 网站名称 |
| `MAX_CODES_PER_USER` | `10` | 每用户最大二维码数量 |
| `NOTIFICATION_ENABLED` | `true` | 是否启用通知功能 |
| `AUTO_APPROVE_REGISTRATION` | `true` | 是否自动批准注册 |

## 🚨 安全提醒

### 生产环境部署前必须：
1. ✅ 修改管理员密码
2. ✅ 配置生产环境数据库
3. ✅ 设置环境变量
4. ✅ 配置HTTPS
5. ✅ 设置适当的CORS策略
6. ✅ 配置通知服务API密钥

### 推荐的生产环境配置：
```bash
# .env.production
NODE_ENV=production
DATABASE_URL="your-production-database-url"
JWT_SECRET="your-secure-jwt-secret"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="https://your-domain.com"
```

## 🐛 常见问题

### 1. 数据库连接失败
```bash
# 检查数据库文件权限
ls -la dev.db

# 重新生成数据库
npm run db:reset
npm run db:push
```

### 2. 管理员账户创建失败
```bash
# 手动创建管理员
npm run create-admin
```

### 3. 端口被占用
```bash
# 查看端口占用
lsof -i :3000

# 或修改端口（server.ts中修改currentPort）
```

### 4. 权限不足
```bash
# macOS/Linux
sudo chown -R $USER:$USER .
chmod -R 755 .
```

## 📖 更多文档

- [API接口文档](./API_TEST_REPORT.md)
- [部署指南](./DEPLOYMENT.md)
- [用户认证指南](./USER_AUTH_GUIDE.md)
- [快速开始](./QUICK_START.md)

## 🆘 获取帮助

如果遇到问题：
1. 查看控制台日志
2. 检查 `dev.log` 或 `server.log` 文件
3. 确认数据库连接正常
4. 验证环境变量配置

---

🎉 **恭喜！你的 Move Car DB 系统已准备就绪！**