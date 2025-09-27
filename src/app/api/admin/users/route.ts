import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authMiddleware } from '@/lib/middleware'
import { isAdmin } from '@/lib/auth'
import { z } from 'zod'

// 用户创建验证 schema
const createUserSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码'),
  name: z.string().min(2, '姓名至少2个字符'),
  email: z.string().email('请输入有效的邮箱地址').optional().or(z.literal('')),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
  isActive: z.boolean().default(true)
})

// 用户更新验证 schema
const updateUserSchema = z.object({
  name: z.string().min(2, '姓名至少2个字符').optional(),
  email: z.string().email('请输入有效的邮箱地址').optional().or(z.literal('')),
  role: z.enum(['USER', 'ADMIN']).optional(),
  isActive: z.boolean().optional()
})

// 获取所有用户（管理员）
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResponse = await authMiddleware(request, 'ADMIN')
    if (authResponse.status !== 200) {
      return authResponse
    }
    
    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    
    const skip = (page - 1) * limit
    
    // 构建查询条件
    const where: any = {}
    
    if (search) {
      where.OR = [
        { phone: { contains: search } },
        { name: { contains: search } },
        { email: { contains: search } }
      ]
    }
    
    if (role) {
      where.role = role
    }
    
    // 获取用户列表
    const [users, total] = await Promise.all([
      db.owner.findMany({
        where,
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLogin: true,
          _count: {
            select: {
              vehicles: true,
              codes: true,
              records: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      db.owner.count({ where })
    ])
    
    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
    
  } catch (error) {
    console.error('获取用户列表错误:', error)
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    )
  }
}

// 创建用户（管理员）
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResponse = await authMiddleware(request, 'ADMIN')
    if (authResponse.status !== 200) {
      return authResponse
    }
    
    const body = await request.json()
    
    // 验证输入
    const validatedData = createUserSchema.parse(body)
    
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
    
    // 创建用户（初始密码为手机号后6位）
    const { hashPassword } = await import('@/lib/auth')
    const initialPassword = validatedData.phone.slice(-6)
    const hashedPassword = await hashPassword(initialPassword)
    
    const user = await db.owner.create({
      data: {
        phone: validatedData.phone,
        name: validatedData.name,
        email: validatedData.email || null,
        password: hashedPassword,
        role: validatedData.role,
        isActive: validatedData.isActive
      },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })
    
    return NextResponse.json({
      message: '用户创建成功',
      user,
      initialPassword
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据格式错误', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('创建用户错误:', error)
    return NextResponse.json(
      { error: '创建用户失败' },
      { status: 500 }
    )
  }
}