import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// 创建记录的验证模式
const createRecordSchema = z.object({
  codeId: z.string().min(1, '挪车码ID不能为空'),
  message: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  location: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 验证请求数据
    const validatedData = createRecordSchema.parse(body)
    
    // 检查挪车码是否存在
    const code = await db.code.findUnique({
      where: { id: validatedData.codeId },
      include: {
        vehicle: {
          include: {
            owner: true,
          },
        },
        owner: true,
      },
    })
    
    if (!code) {
      return NextResponse.json(
        { error: '挪车码不存在' },
        { status: 404 }
      )
    }
    
    // 检查挪车码是否已停用
    if (!code.isActive) {
      return NextResponse.json(
        { error: '此挪车码已停用' },
        { status: 400 }
      )
    }
    
    // 检查挪车码是否已过期
    if (code.expiredAt && new Date() > new Date(code.expiredAt)) {
      return NextResponse.json(
        { error: '此挪车码已过期' },
        { status: 400 }
      )
    }
    
    // 获取客户端IP地址
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    request.headers.get('cf-connecting-ip') ||
                    'unknown'
    
    // 获取User-Agent
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // 创建扫码记录
    const record = await db.record.create({
      data: {
        codeId: validatedData.codeId,
        ownerId: code.ownerId, // 添加 ownerId
        message: validatedData.message || '',
        ipAddress: validatedData.ipAddress || clientIP,
        userAgent: validatedData.userAgent || userAgent,
        location: validatedData.location,
        scanTime: new Date(),
      },
      include: {
        code: {
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
          },
        },
      },
    })
    
    // TODO: 在这里可以添加发送通知的逻辑，比如：
    // - 发送短信给车主
    // - 发送邮件给车主
    // - 发送推送通知等
    
    return NextResponse.json({
      success: true,
      data: record,
      message: '挪车通知已发送',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('创建扫码记录失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const codeId = searchParams.get('codeId')
    const ownerId = searchParams.get('ownerId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    
    let where: any = {}
    
    if (codeId) {
      where.codeId = codeId
    }
    
    if (ownerId) {
      where.code = {
        ownerId: ownerId
      }
    }
    
    const [records, total] = await Promise.all([
      db.record.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { scanTime: 'desc' },
        include: {
          code: {
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
            },
          },
        },
      }),
      db.record.count({ where }),
    ])
    
    return NextResponse.json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取扫码记录失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}