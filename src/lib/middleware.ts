import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, hasPermission } from './auth'

// 认证中间件
export async function authMiddleware(request: NextRequest, requiredRole?: string) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
    
    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      )
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      )
    }
    
    // 检查角色权限
    if (requiredRole && !hasPermission(payload.role, requiredRole)) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      )
    }
    
    // 在请求头中添加用户信息
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-user-phone', payload.phone)
    requestHeaders.set('x-user-role', payload.role)
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: '认证失败' },
      { status: 500 }
    )
  }
}

// 获取当前用户信息
export function getCurrentUser(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userPhone = request.headers.get('x-user-phone')
  const userRole = request.headers.get('x-user-role')
  
  if (!userId || !userPhone || !userRole) {
    return null
  }
  
  return {
    id: userId,
    phone: userPhone,
    role: userRole
  }
}