# 用户认证系统使用指南

## 🎯 系统概述

扫码挪车系统现在已完整集成了用户认证系统，支持：

- ✅ 用户注册和登录
- ✅ 管理员用户管理
- ✅ 角色权限控制（普通用户/管理员）
- ✅ JWT Token 认证
- ✅ 车辆管理（需要登录）
- ✅ 挪车码管理（需要登录）
- ✅ 扫描记录查看（需要登录）

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库和JWT密钥

# 推送数据库schema
npm run db:push

# 生成Prisma客户端
npm run db:generate
```

### 2. 创建管理员用户

```bash
# 创建初始管理员用户
npm run create-admin
```

管理员账户信息：
- **手机号**: `13800138000`
- **密码**: `admin123`
- **角色**: 管理员

⚠️ **安全提醒**: 请立即登录并修改管理员密码！

### 3. 启动应用

```bash
# 启动开发服务器
npm run dev
```

访问 `http://localhost:3000` 开始使用系统。

## 📱 用户使用流程

### 1. 用户注册

1. 访问系统首页，会自动跳转到登录页面
2. 点击"立即注册"按钮
3. 填写注册信息：
   - 手机号（必填）
   - 姓名（必填）
   - 邮箱（可选）
   - 密码（至少6位）
4. 提交注册，自动登录并跳转到主页

### 2. 用户登录

1. 在登录页面输入：
   - 手机号
   - 密码
2. 点击"登录"按钮
3. 登录成功后跳转到主页

### 3. 车辆管理

登录后可以：

- **添加车辆**: 填写车牌号、品牌、型号、颜色等信息
- **查看车辆**: 查看已添加的所有车辆
- **生成挪车码**: 为每辆车生成挪车码

### 4. 挪车码管理

- **生成挪车码**: 为车辆生成唯一的挪车码
- **查看挪车码**: 查看所有挪车码及其状态
- **启用/停用**: 控制挪车码的启用状态
- **复制挪车码**: 一键复制挪车码到剪贴板

### 5. 查看记录

- **扫描记录**: 查看所有挪车码的扫描记录
- **详细信息**: 包括扫描时间、IP地址、留言等

## 👨‍💼 管理员功能

### 1. 访问管理后台

管理员登录后，点击右上角的"管理后台"按钮进入管理界面。

### 2. 用户管理

- **查看用户列表**: 查看所有注册用户
- **搜索用户**: 按手机号、姓名、邮箱搜索
- **角色筛选**: 按用户角色筛选
- **创建用户**: 手动创建新用户
- **编辑用户**: 修改用户信息
- **启用/禁用**: 控制用户账户状态
- **重置密码**: 为用户重置密码
- **删除用户**: 删除用户及其相关数据

### 3. 权限说明

- **普通用户**: 只能管理自己的车辆和挪车码
- **管理员**: 可以管理所有用户的数据，拥有系统管理权限

## 🔐 安全特性

### 1. 密码安全

- 使用 bcrypt 进行密码哈希
- 密码强度要求（至少6位）
- 密码不在日志中记录

### 2. JWT 认证

- 使用 JWT Token 进行无状态认证
- Token 有效期 7 天
- 支持 Token 撤销（退出登录）

### 3. 权限控制

- 基于角色的访问控制（RBAC）
- API 路由级别的权限验证
- 前端路由保护

### 4. 数据保护

- 用户只能访问自己的数据
- 敏感信息加密存储
- 输入数据验证和清理

## 🛠️ API 接口

### 认证相关

```
POST /api/auth/register    # 用户注册
POST /api/auth/login       # 用户登录
GET  /api/auth/me          # 获取当前用户信息
POST /api/auth/logout      # 退出登录
```

### 用户管理（管理员）

```
GET    /api/admin/users           # 获取用户列表
POST   /api/admin/users           # 创建用户
GET    /api/admin/users/[id]      # 获取用户详情
PUT    /api/admin/users/[id]      # 更新用户
DELETE /api/admin/users/[id]      # 删除用户
POST   /api/admin/users/[id]/reset-password  # 重置密码
```

### 车辆管理

```
GET  /api/vehicles        # 获取车辆列表
POST /api/vehicles        # 添加车辆
```

### 挪车码管理

```
GET  /api/codes           # 获取挪车码列表
POST /api/codes           # 生成挪车码
POST /api/codes/[id]/toggle  # 启用/停用挪车码
```

### 记录查看

```
GET /api/records/owner/me  # 获取用户扫描记录
```

## 🚨 故障排除

### 1. 登录失败

- 检查手机号和密码是否正确
- 确认用户账户是否被禁用
- 检查网络连接

### 2. 权限错误

- 确认用户角色是否正确
- 检查 Token 是否有效
- 重新登录尝试

### 3. 数据加载失败

- 检查 API 请求是否包含正确的 Token
- 确认网络连接正常
- 查看浏览器控制台错误信息

### 4. 管理员功能无法访问

- 确认用户是否具有管理员角色
- 检查管理员权限设置
- 重新登录尝试

## 📝 开发说明

### 1. 添加新的认证保护

```typescript
// 在 API 路由中添加认证中间件
import { authMiddleware, getCurrentUser } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  const authResponse = await authMiddleware(request)
  if (authResponse.status !== 200) {
    return authResponse
  }
  
  const currentUser = getCurrentUser(request)
  // 继续处理业务逻辑
}
```

### 2. 前端组件认证保护

```typescript
// 使用 AuthGuard 组件保护页面
import { AuthGuard } from '@/components/auth/auth-guard'

export default function ProtectedPage() {
  return (
    <AuthGuard>
      {/* 需要认证的内容 */}
    </AuthGuard>
  )
}
```

### 3. 检查用户权限

```typescript
// 在组件中使用 useAuth hook
import { useAuth } from '@/hooks/use-auth'

function MyComponent() {
  const { user, isAdmin } = useAuth()
  
  if (isAdmin) {
    // 管理员权限
  }
  
  // 普通用户权限
}
```

## 🎉 总结

扫码挪车系统的用户认证功能现已完整实现，提供了安全的用户管理、灵活的权限控制和友好的用户界面。系统支持多车辆管理、挪车码生成和扫描记录查看，满足停车管理的各种需求。

管理员可以通过管理后台对用户进行全面管理，确保系统的安全性和稳定性。普通用户可以方便地管理自己的车辆和挪车码，享受便捷的停车服务。