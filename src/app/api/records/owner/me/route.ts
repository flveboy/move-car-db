import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authMiddleware, getCurrentUser } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    // 验证用户认证
    const authResponse = await authMiddleware(request)
    if (authResponse.status !== 200) {
      return authResponse
    }
    
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json(
        { error: '用户认证失败' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    
    // 获取用户的扫描记录
    const [records, total] = await Promise.all([
      db.record.findMany({
        where: { ownerId: currentUser.id },
        skip: offset,
        take: limit,
        orderBy: { scanTime: 'desc' },
        include: {
          code: {
            include: {
              vehicle: {
                select: {
                  licensePlate: true,
                  brand: true,
                  model: true
                }
              }
            }
          }
        }
      }),
      db.record.count({ where: { ownerId: currentUser.id } })
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
    console.error('获取用户记录失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}