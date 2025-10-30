import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, generateToken, formatAuthUser } from '@/lib/auth'
import { z } from 'zod'

// 登录验证 schema
const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 验证输入
    const validatedData = loginSchema.parse(body)
    
    // 查找用户
    const user = await db.owner.findUnique({
      where: { username: validatedData.username }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: '系统中不存在此用户', userExists: false },
        { status: 404 }
      )
    }
    
    // 检查用户是否被禁用
    if (!user.isActive) {
      return NextResponse.json(
        { error: '账户已被禁用' },
        { status: 403 }
      )
    }
    
    // 验证密码
    const isPasswordValid = await verifyPassword(validatedData.password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      )
    }
    
    // 更新最后登录时间
    await db.owner.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })
    
    // 生成 token
    const token = generateToken(user)
    
    // 返回用户信息和 token
    return NextResponse.json({
      message: '登录成功',
      user: formatAuthUser(user),
      token
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据格式错误', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('登录错误:', error)
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    )
  }
}