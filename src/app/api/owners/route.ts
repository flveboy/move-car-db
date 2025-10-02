import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { OwnerCache } from '@/lib/cache-utils'
import { hashPassword } from '@/lib/auth'

// 创建车主的验证模式
const createOwnerSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(20, '用户名最多20个字符'),
  phone: z.string().min(1, '手机号不能为空'),
  name: z.string().min(1, '姓名不能为空'),
  email: z.string().email('邮箱格式不正确').optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 验证请求数据
    const validatedData = createOwnerSchema.parse(body)
    
    // 检查手机号是否已存在（使用缓存）
    const existingOwner = await OwnerCache.getByPhone(validatedData.phone, async () => {
      return await db.owner.findUnique({
        where: { phone: validatedData.phone }
      })
    })
    
    if (existingOwner) {
      return NextResponse.json(
        { error: '该手机号已注册' },
        { status: 400 }
      )
    }
    
    // 创建车主（使用缓存清理）
    const defaultPassword = '123456' // 默认密码，实际应用中应该让用户设置
    const hashedPassword = await hashPassword(defaultPassword)
    
    // 检查用户名是否已存在
    const existingUsername = await db.owner.findUnique({
      where: { username: validatedData.username }
    })
    
    if (existingUsername) {
      return NextResponse.json(
        { error: '该用户名已被使用' },
        { status: 400 }
      )
    }

    const owner = await OwnerCache.create(async () => {
      return await db.owner.create({
        data: {
          username: validatedData.username,
          phone: validatedData.phone,
          name: validatedData.name,
          email: validatedData.email,
          password: hashedPassword,
        },
      })
    }, validatedData.phone)
    
    return NextResponse.json({
      success: true,
      data: owner,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('创建车主失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    
    if (phone) {
      // 根据手机号查询车主（使用缓存）
      const owner = await OwnerCache.getByPhone(phone, async () => {
        return await db.owner.findUnique({
          where: { phone },
          include: {
            vehicles: true,
            codes: {
              include: {
                vehicle: true,
                records: {
                  orderBy: { createdAt: 'desc' },
                  take: 10,
                },
              },
            },
          },
        })
      })
      
      if (!owner) {
        return NextResponse.json(
          { error: '车主不存在' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: owner,
      })
    }
    
    // 获取所有车主（分页）
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    
    const [owners, total] = await Promise.all([
      db.owner.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicles: true,
          _count: {
            select: {
              vehicles: true,
              codes: true,
            },
          },
        },
      }),
      db.owner.count(),
    ])
    
    return NextResponse.json({
      success: true,
      data: owners,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取车主列表失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}