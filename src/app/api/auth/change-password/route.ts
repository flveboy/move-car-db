import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeader, verifyPassword, hashPassword } from '@/lib/auth'
import { z } from 'zod'

// 修改密码验证 schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string().min(6, '新密码至少需要6个字符'),
  confirmPassword: z.string().min(1, '请确认新密码')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword']
})

export async function POST(request: NextRequest) {
  try {
    // 获取并验证 token
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader || undefined)
    
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
    
    // 解析请求体
    const body = await request.json()
    
    // 验证输入
    const validatedData = changePasswordSchema.parse(body)
    
    // 获取用户信息
    const user = await db.owner.findUnique({
      where: { id: payload.userId }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }
    
    // 验证当前密码
    const isCurrentPasswordValid = await verifyPassword(validatedData.currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: '当前密码不正确' },
        { status: 400 }
      )
    }
    
    // 哈希新密码
    const hashedNewPassword = await hashPassword(validatedData.newPassword)
    
    // 更新密码
    await db.owner.update({
      where: { id: user.id },
      data: { 
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json({
      message: '密码修改成功'
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据格式错误', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('修改密码错误:', error)
    return NextResponse.json(
      { error: '修改密码失败，请稍后重试' },
      { status: 500 }
    )
  }
}