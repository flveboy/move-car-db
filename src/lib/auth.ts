import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Owner } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const SALT_ROUNDS = 12

export interface JWTPayload {
  userId: string
  phone: string
  role: string
}

export interface AuthUser {
  id: string
  phone: string
  name: string
  email?: string
  role: string
}

// 密码哈希
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// 验证密码
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// 生成 JWT Token
export function generateToken(user: Owner): string {
  const payload: JWTPayload = {
    userId: user.id,
    phone: user.phone,
    role: user.role
  }
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

// 验证 JWT Token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}

// 从请求头中获取 Token
export function getTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  return authHeader.substring(7)
}

// 检查用户权限
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    'USER': 0,
    'ADMIN': 1
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

// 管理员权限检查
export function isAdmin(userRole: string): boolean {
  return userRole === 'ADMIN'
}

// 格式化用户信息（返回给前端的用户对象）
export function formatAuthUser(user: Owner): AuthUser {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    email: user.email || undefined,
    role: user.role
  }
}