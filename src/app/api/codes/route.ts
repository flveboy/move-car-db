import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { z } from 'zod'

// 生成随机挪车码
function generateCode(): string {
  return 'NC' + Math.random().toString(36).substr(2, 9).toUpperCase()
}

// 创建挪车码的验证模式
const createCodeSchema = z.object({
  vehicleId: z.string().min(1, '车辆ID不能为空'),
  driverId: z.string().optional().nullable(),
  expiredAt: z.string().datetime().optional().nullable(),
})

// 获取当前用户信息的辅助函数
async function getCurrentUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = getTokenFromHeader(authHeader || undefined)
  
  if (!token) {
    return null
  }
  
  const payload = verifyToken(token)
  if (!payload) {
    return null
  }
  
  return {
    id: payload.userId,
    phone: payload.phone,
    role: payload.role
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户认证
    const currentUser = await getCurrentUserFromToken(request)
    if (!currentUser) {
      return NextResponse.json(
        { error: '用户认证失败' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    
    // 验证请求数据
    const validatedData = createCodeSchema.parse(body)
    
    // 检查车辆是否存在且属于当前用户
    const vehicle = await db.vehicle.findUnique({
      where: { id: validatedData.vehicleId },
      include: { 
        owner: true
      }
    })
    
    if (!vehicle) {
      return NextResponse.json(
        { error: '车辆不存在' },
        { status: 404 }
      )
    }
    
    // 检查车辆是否属于当前用户（或管理员）
    if (vehicle.ownerId !== currentUser.id && currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '无权限为该车辆创建挪车码' },
        { status: 403 }
      )
    }
    
    // 如果指定了代开驾驶员，验证驾驶员是否存在且属于该车辆
    let driver: { id: string } | null = null
    if (validatedData.driverId) {
      // 仅支持UUID格式的driverId查询
      driver = await db.driver.findFirst({
        where: {
          vehicleId: validatedData.vehicleId,
          id: validatedData.driverId
        }
      })
      
      if (!driver) {
        return NextResponse.json(
          { error: '代开驾驶员不存在或不属于该车辆' },
          { status: 404 }
        )
      }
    }

    // 生成唯一的挪车码
    let code
    let attempts = 0
    const maxAttempts = 10
    
    do {
      code = generateCode()
      attempts++
      
      if (attempts > maxAttempts) {
        return NextResponse.json(
          { error: '生成挪车码失败，请重试' },
          { status: 500 }
        )
      }
    } while (await db.code.findUnique({ where: { code } }))
    
    // 创建挪车码
    const newCode = await db.code.create({
      data: {
        vehicleId: validatedData.vehicleId,
        ownerId: vehicle.ownerId,
        driverId: driver?.id ?? null,  // 使用更安全的null检查
        code: code,
        isActive: true,
        expiredAt: validatedData.expiredAt ? new Date(validatedData.expiredAt) : null,
      },
      include: {
        vehicle: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        driver: validatedData.driverId ? {
          select: {
            id: true,
            name: true,
            phone: true,
            dingtalkWebhook: true,
            dingtalkSign: true,
            dingtalkKeyword: true,
            dingtalkSecret: true,
            wechatWebhook: true,
          },
        } : undefined,
      },
    })
    
    return NextResponse.json({
      success: true,
      data: newCode,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('创建挪车码失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // 验证用户认证
    const currentUser = await getCurrentUserFromToken(request)
    if (!currentUser) {
      return NextResponse.json(
        { error: '用户认证失败' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')
    const isActive = searchParams.get('isActive')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    
    // 管理员可以查看所有挪车码，普通用户只能查看自己的挪车码
    const isAdmin = currentUser.role === 'ADMIN'
    let where: any = {}
    
    if (vehicleId) {
      where.vehicleId = vehicleId
    }
    
    if (!isAdmin) {
      where.ownerId = currentUser.id
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }
    
    const [codes, total] = await Promise.all([
      db.code.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
          owner: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          driver: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          records: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          _count: {
            select: {
              records: true,
            },
          },
        },
      }),
      db.code.count({ where }),
    ])
    
    return NextResponse.json({
      success: true,
      data: codes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取挪车码列表失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}