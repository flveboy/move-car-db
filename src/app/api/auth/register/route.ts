import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, generateToken, formatAuthUser } from '@/lib/auth'
import { z } from 'zod'

// 注册验证 schema
const registerSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(20, '用户名最多20个字符'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码'),
  name: z.string().min(2, '姓名至少2个字符'),
  email: z.string().email('请输入有效的邮箱地址').optional().or(z.literal('')),
  password: z.string().min(6, '密码至少6个字符'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword']
})

export async function POST(request: NextRequest) {
  try {
    // 检查是否开放注册
    const allowRegistrationConfig = await db.systemConfig.findUnique({
      where: { key: 'ALLOW_REGISTRATION' }
    })
    
    const allowRegistration = allowRegistrationConfig?.value === 'true' || allowRegistrationConfig === null
    
    if (!allowRegistration) {
      return NextResponse.json(
        { error: '系统暂未开放注册，请联系管理员' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // 验证输入
    const validatedData = registerSchema.parse(body)
    
    // 检查用户名和手机号是否已存在
    const existingUserByUsername = await db.owner.findUnique({
      where: { username: validatedData.username }
    })
    
    if (existingUserByUsername) {
      return NextResponse.json(
        { error: '该用户名已被使用' },
        { status: 400 }
      )
    }
    
    const existingUserByPhone = await db.owner.findUnique({
      where: { phone: validatedData.phone }
    })
    
    if (existingUserByPhone) {
      return NextResponse.json(
        { error: '该手机号已注册' },
        { status: 400 }
      )
    }
    
    // 哈希密码
    const hashedPassword = await hashPassword(validatedData.password)
    
    // 创建用户
    const user = await db.owner.create({
      data: {
        username: validatedData.username,
        phone: validatedData.phone,
        name: validatedData.name,
        email: validatedData.email || null,
        password: hashedPassword,
        role: 'USER'
      }
    })
    
    // 生成 token
    const token = generateToken(user)
    
    // 返回用户信息和 token
    return NextResponse.json({
      message: '注册成功',
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
    
    console.error('注册错误:', error)
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    )
  }
}