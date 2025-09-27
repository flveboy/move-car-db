# 挪车通知系统本地部署指南

本文档提供了挪车通知系统在本地环境中的完整部署指南，包括开发环境搭建、依赖安装、数据库配置和应用启动。

## 目录

- [系统要求](#系统要求)
- [环境准备](#环境准备)
- [项目克隆](#项目克隆)
- [依赖安装](#依赖安装)
- [数据库配置](#数据库配置)
- [环境变量配置](#环境变量配置)
- [应用启动](#应用启动)
- [开发模式运行](#开发模式运行)
- [生产模式运行](#生产模式运行)
- [数据库管理](#数据库管理)
- [常见问题](#常见问题)
- [维护和监控](#维护和监控)

## 系统要求

### 硬件要求
- **CPU**: 2核以上
- **内存**: 4GB 以上（推荐 8GB）
- **存储**: 10GB 可用空间

### 软件要求
- **操作系统**: Windows 10/11, macOS 10.14+, Linux (Ubuntu 18.04+)
- **Node.js**: 18.0.0 或更高版本
- **npm**: 8.0.0 或更高版本
- **Git**: 2.0.0 或更高版本
- **数据库**: SQLite (默认) 或 PostgreSQL/MySQL

## 环境准备

### 1. 安装 Node.js

#### Windows
1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 LTS 版本（推荐 18.x 或 20.x）
3. 运行安装程序，按提示完成安装
4. 验证安装：
   ```cmd
   node --version
   npm --version
   ```

#### macOS
使用 Homebrew 安装：
```bash
brew install node
node --version
npm --version
```

#### Linux (Ubuntu/Debian)
```bash
# 使用 NodeSource 仓库安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 2. 安装 Git

#### Windows
1. 访问 [Git 官网](https://git-scm.com/)
2. 下载并安装 Git for Windows
3. 验证安装：
   ```cmd
   git --version
   ```

#### macOS
```bash
brew install git
git --version
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install git
git --version
```

### 3. 安装数据库工具（可选）

#### SQLite（默认，无需额外安装）
SQLite 已经包含在项目中，无需额外安装。

#### PostgreSQL（可选）
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql

# Windows
下载并安装 PostgreSQL 官方安装包
```

#### MySQL（可选）
```bash
# Ubuntu/Debian
sudo apt-get install mysql-server

# macOS
brew install mysql

# Windows
下载并安装 MySQL 官方安装包
```

## 项目克隆

### 1. 获取项目代码
```bash
# 克隆项目
git clone https://github.com/your-username/挪车通知系统.git

# 进入项目目录
cd 挪车通知系统
```

### 2. 检查项目结构
```bash
# 查看项目结构
ls -la
```

项目应该包含以下主要文件和目录：
```
挪车通知系统/
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── ...
├── prisma/
├── public/
├── package.json
├── next.config.js
├── tailwind.config.js
└── ...
```

## 依赖安装

### 1. 安装项目依赖
```bash
# 安装所有依赖
npm install
```

### 2. 验证依赖安装
```bash
# 检查 package.json 中的依赖是否正确安装
npm list --depth=0
```

### 3. 安装全局工具（可选）
```bash
# 安装 Prisma CLI（全局）
npm install -g prisma

# 安装 Next.js CLI（全局）
npm install -g next
```

## 数据库配置

### 1. SQLite 配置（默认）

#### 生成 Prisma 客户端
```bash
# 生成 Prisma 客户端
npx prisma generate
```

#### 推送数据库 schema
```bash
# 创建数据库并推送 schema
npx prisma db push
```

#### 验证数据库
```bash
# 查看数据库
ls -la prisma/
# 应该能看到 dev.db 文件
```

### 2. PostgreSQL 配置（可选）

#### 创建数据库
```bash
# 连接到 PostgreSQL
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE 挪车通知系统;
CREATE USER 挪车用户 WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE 挪车通知系统 TO 挪车用户;
\q
```

#### 配置 Prisma
编辑 `prisma/schema.prisma` 文件：
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### 设置环境变量
```bash
# 临时设置（当前会话）
export DATABASE_URL="postgresql://挪车用户:your-password@localhost:5432/挪车通知系统"

# 或创建 .env 文件
echo "DATABASE_URL=postgresql://挪车用户:your-password@localhost:5432/挪车通知系统" > .env
```

#### 生成和推送
```bash
# 生成 Prisma 客户端
npx prisma generate

# 推送 schema
npx prisma db push
```

### 3. MySQL 配置（可选）

#### 创建数据库
```bash
# 连接到 MySQL
mysql -u root -p

# 创建数据库和用户
CREATE DATABASE 挪车通知系统;
CREATE USER '挪车用户'@'localhost' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON 挪车通知系统.* TO '挪车用户'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 配置 Prisma
编辑 `prisma/schema.prisma` 文件：
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

#### 设置环境变量
```bash
# 临时设置（当前会话）
export DATABASE_URL="mysql://挪车用户:your-password@localhost:3306/挪车通知系统"

# 或创建 .env 文件
echo "DATABASE_URL=mysql://挪车用户:your-password@localhost:3306/挪车通知系统" > .env
```

#### 生成和推送
```bash
# 生成 Prisma 客户端
npx prisma generate

# 推送 schema
npx prisma db push
```

## 环境变量配置

### 1. 创建 .env 文件
```bash
# 复制环境变量模板
cp .env.example .env.local
```

### 2. 编辑环境变量
编辑 `.env.local` 文件，配置以下变量：

```bash
# 数据库配置
DATABASE_URL="file:./dev.db"  # SQLite 默认配置
# DATABASE_URL="postgresql://挪车用户:your-password@localhost:5432/挪车通知系统"  # PostgreSQL
# DATABASE_URL="mysql://挪车用户:your-password@localhost:3306/挪车通知系统"  # MySQL

# NextAuth 配置
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# 应用配置
NEXT_PUBLIC_APP_NAME="挪车通知系统"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# 可选：钉钉配置
DINGTALK_APP_KEY="your-dingtalk-app-key"
DINGTALK_APP_SECRET="your-dingtalk-app-secret"

# 可选：企业微信配置
WECHAT_CORP_ID="your-wechat-corp-id"
WECHAT_CORP_SECRET="your-wechat-corp-secret"
```

### 3. 生成密钥
```bash
# 生成 NextAuth 密钥
openssl rand -base64 32
# 将生成的密钥复制到 NEXTAUTH_SECRET
```

## 应用启动

### 1. 开发模式启动
```bash
# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 查看应用。

### 2. 生产模式启动
```bash
# 构建应用
npm run build

# 启动生产服务器
npm start
```

### 3. 后台运行（Linux/macOS）
```bash
# 使用 pm2 管理进程
npm install -g pm2

# 启动应用
pm2 start npm --name "挪车通知系统" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs 挪车通知系统

# 停止应用
pm2 stop 挪车通知系统

# 重启应用
pm2 restart 挪车通知系统
```

### 4. 后台运行（Windows）
使用 NSSM (Non-Sucking Service Manager)：

```cmd
# 下载并安装 NSSM
# 下载地址：https://nssm.cc/download

# 创建服务
nssm install 挪车通知系统 "C:\Program Files\nodejs\node.exe" "C:\path\to\project\npm start"

# 启动服务
nssm start 挪车通知系统

# 查看服务状态
nssm status 挪车通知系统

# 停止服务
nssm stop 挪车通知系统
```

## 开发模式运行

### 1. 启动开发服务器
```bash
# 启动开发服务器
npm run dev
```

### 2. 开发服务器特性
- **热重载**: 代码修改后自动重启
- **TypeScript 检查**: 实时类型检查
- **ESLint 检查**: 代码质量检查
- **开发工具**: 内置开发工具

### 3. 开发调试
```bash
# 启动调试模式
npm run dev:debug

# 或使用 VS Code 调试
# 创建 .vscode/launch.json 文件
```

### 4. 代码检查
```bash
# 运行 ESLint 检查
npm run lint

# 自动修复 ESLint 问题
npm run lint:fix

# 运行 TypeScript 检查
npm run type-check
```

## 生产模式运行

### 1. 构建优化
```bash
# 构建生产版本
npm run build

# 分析构建包大小
npm run analyze
```

### 2. 启动生产服务器
```bash
# 启动生产服务器
npm start

# 指定端口启动
PORT=3001 npm start
```

### 3. 生产环境特性
- **代码压缩**: JavaScript 和 CSS 自动压缩
- **图片优化**: 图片自动优化和格式转换
- **缓存优化**: 静态资源缓存优化
- **性能优化**: 自动代码分割和懒加载

### 4. 性能监控
```bash
# 安装性能监控工具
npm install -g autocannon

# 性能测试
autocannon -c 10 -d 30 http://localhost:3000
```

## 数据库管理

### 1. 数据库迁移
```bash
# 生成迁移文件
npx prisma migrate dev --name init

# 应用迁移
npx prisma migrate deploy

# 重置数据库
npx prisma migrate reset
```

### 2. 数据库种子
```bash
# 创建种子数据文件
# prisma/seed.ts

# 运行种子数据
npx prisma db seed
```

### 3. 数据库备份和恢复

#### SQLite 备份和恢复
```bash
# 备份
sqlite3 prisma/dev.db ".backup prisma/backup.db"

# 恢复
sqlite3 prisma/dev.db ".restore prisma/backup.db"
```

#### PostgreSQL 备份和恢复
```bash
# 备份
pg_dump 挪车通知系统 > backup.sql

# 恢复
psql 挪车通知系统 < backup.sql
```

#### MySQL 备份和恢复
```bash
# 备份
mysqldump 挪车通知系统 > backup.sql

# 恢复
mysql 挪车通知系统 < backup.sql
```

### 4. 数据库可视化工具
```bash
# 启动 Prisma Studio
npx prisma studio

# 访问 http://localhost:5555
```

## 常见问题

### 1. 端口冲突
**问题**: 3000 端口被占用
**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# 终止进程
kill -9 PID  # macOS/Linux
taskkill /PID PID /F  # Windows

# 或使用其他端口
PORT=3001 npm run dev
```

### 2. 依赖安装失败
**问题**: npm install 失败
**解决方案**:
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 3. 数据库连接失败
**问题**: 数据库连接错误
**解决方案**:
```bash
# 检查数据库服务状态
sudo systemctl status postgresql  # PostgreSQL
sudo systemctl status mysql  # MySQL

# 检查环境变量
echo $DATABASE_URL

# 测试数据库连接
npx prisma db push
```

### 4. 权限问题
**问题**: 文件权限错误
**解决方案**:
```bash
# 修复文件权限
sudo chown -R $USER:$USER /path/to/project
chmod -R 755 /path/to/project
```

### 5. 内存不足
**问题**: 构建时内存不足
**解决方案**:
```bash
# 增加 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

## 维护和监控

### 1. 日志管理
```bash
# 查看应用日志
tail -f logs/app.log

# 使用 pm2 查看日志
pm2 logs 挪车通知系统

# 日志轮转配置
pm2 install pm2-logrotate
```

### 2. 性能监控
```bash
# 使用 pm2 监控
pm2 monit

# 系统资源监控
htop  # macOS/Linux
taskmgr  # Windows
```

### 3. 自动重启配置
```bash
# 使用 pm2 配置自动重启
pm2 start npm --name "挪车通知系统" -- start --watch

# 设置开机自启
pm2 startup
pm2 save
```

### 4. 定时任务
```bash
# 使用 crontab 设置定时任务
crontab -e

# 添加定时备份任务
0 2 * * * /path/to/backup-script.sh
```

### 5. 健康检查
```bash
# 创建健康检查脚本
#!/bin/bash
# health-check.sh

if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "应用运行正常"
else
    echo "应用异常，尝试重启"
    pm2 restart 挪车通知系统
fi
```

## 故障排除

### 1. 应用无法启动
```bash
# 检查错误日志
pm2 logs 挪车通知系统 --lines 50

# 检查端口占用
netstat -tlnp | grep :3000

# 检查数据库连接
npx prisma db push
```

### 2. 性能问题
```bash
# 检查内存使用
free -h  # Linux
vm_stat  # macOS

# 检查 CPU 使用
top  # Linux/macOS

# 检查数据库性能
npx prisma studio
```

### 3. 网络问题
```bash
# 检查网络连接
ping google.com

# 检查防火墙
sudo ufw status  # Ubuntu
sudo firewall-cmd --list-all  # CentOS

# 检查端口开放
telnet localhost 3000
```

---

## 联系支持

如果在本地部署过程中遇到问题，可以：

1. 查看项目文档和 README
2. 检查 GitHub Issues
3. 搜索相关错误信息
4. 联系技术支持团队

希望这份本地部署指南对您有所帮助！如有任何问题，请随时联系。