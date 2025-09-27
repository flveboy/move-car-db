import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, generateToken, formatAuthUser } from '@/lib/auth'
import { z } from 'zod'

// 注册验证 schema
const registerSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码'),
  name: z.string().min(2, '姓名至少2个字符'),
  email: z.string().email('请输入有效的邮箱地址').optional().or(z.literal('')),
  password: z.string().min(6, '密码至少6个字符')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 验证输入
    const validatedData = registerSchema.parse(body)
    
    // 检查手机号是否已存在
    const existingUser = await db.owner.findUnique({
      where: { phone: validatedData.phone }
    })
    
    if (existingUser) {
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