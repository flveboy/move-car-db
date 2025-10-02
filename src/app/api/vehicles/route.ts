import { NextRequest, NextResponse } from 'next/server'
import { db, withDatabaseRetry } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { z } from 'zod'

// 创建车辆的验证模式
const createVehicleSchema = z.object({
  licensePlate: z.string().min(1, '车牌号不能为空'),
  brand: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  // 钉钉通知配置
  dingtalkWebhook: z.string().optional(),
  dingtalkSign: z.boolean().default(false),
  dingtalkKeyword: z.string().optional(),
  dingtalkSecret: z.string().optional(),
  // 企微通知配置
  wechatWebhook: z.string().optional(),
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
    const validatedData = createVehicleSchema.parse(body)
    
    // 检查车牌号是否已存在
    const existingVehicle = await db.vehicle.findUnique({
      where: { licensePlate: validatedData.licensePlate }
    })
    
    if (existingVehicle) {
      return NextResponse.json(
        { error: '该车牌号已存在' },
        { status: 400 }
      )
    }
    
    // 创建车辆（使用当前用户ID）
    const vehicle = await db.vehicle.create({
      data: {
        ownerId: currentUser.id,
        licensePlate: validatedData.licensePlate,
        brand: validatedData.brand,
        model: validatedData.model,
        color: validatedData.color,
        // 钉钉通知配置
        dingtalkWebhook: validatedData.dingtalkWebhook,
        dingtalkSign: validatedData.dingtalkSign,
        dingtalkKeyword: validatedData.dingtalkKeyword,
        dingtalkSecret: validatedData.dingtalkSecret,
        // 企微通知配置
        wechatWebhook: validatedData.wechatWebhook,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    })
    
    return NextResponse.json({
      success: true,
      data: vehicle,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('创建车辆失败:', error)
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    
    // 管理员可以查看所有车辆，普通用户只能查看自己的车辆
    const isAdmin = currentUser.role === 'ADMIN'
    const where = isAdmin ? {} : { ownerId: currentUser.id }
    
    // 使用重试机制获取车辆列表
    const [vehicles, total] = await withDatabaseRetry(async () => {
      return Promise.all([
        db.vehicle.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            codes: {
              include: {
                records: {
                  orderBy: { createdAt: 'desc' },
                  take: 3,
                },
              },
            },
            _count: {
              select: {
                codes: true,
              },
            },
          },
        }),
        db.vehicle.count({ where })
      ]);
    });
    
    return NextResponse.json({
      success: true,
      data: vehicles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取车辆列表失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}