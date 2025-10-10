import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { useAuth } from '@/hooks/use-auth'

export async function PUT(request: NextRequest) {
  try {
    // 获取认证令牌
    // const authHeader = request.headers.get('authorization')
    // const token = getTokenFromHeader(authHeader || undefined)
    
    // 改为从useAuth中获取
    const { user, token } = useAuth()

    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      )
    }
    
    // 验证令牌
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      )
    }
    
    // 解析请求体
    const { name, phone, email } = await request.json()
    
    if (!name || !phone) {
      return NextResponse.json(
        { error: '姓名和手机号为必填项' },
        { status: 400 }
      )
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: '手机号格式不正确' },
        { status: 400 }
      )
    }
    
    // 验证邮箱格式（如果提供）
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      )
    }
    
    // 检查手机号是否已被其他用户使用
    const existingUser = await db.owner.findFirst({
      where: {
        phone,
        id: { not: payload.userId }
      }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: '该手机号已被其他用户使用' },
        { status: 400 }
      )
    }
    
    // 更新用户信息
    const updatedUser = await db.owner.update({
      where: { id: payload.userId },
      data: {
        name,
        phone,
        email: email || null,
        updatedAt: new Date()
      },
      select: {
        id: true,
        username: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLogin: true
      }
    })
    
    return NextResponse.json({
      success: true,
      user: updatedUser
    })
    
  } catch (error) {
    console.error('更新个人资料错误:', error)
    return NextResponse.json(
      { error: '更新个人资料失败' },
      { status: 500 }
    )
  }
}