import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codeId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    
    // 检查挪车码是否存在
    const code = await db.code.findUnique({
      where: { id: (await params).codeId },
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
    })
    
    if (!code) {
      return NextResponse.json(
        { error: '挪车码不存在' },
        { status: 404 }
      )
    }
    
    // 获取该挪车码的扫码记录
    const [records, total] = await Promise.all([
      db.record.findMany({
        where: { codeId: (await params).codeId },
        skip: offset,
        take: limit,
        orderBy: { scanTime: 'desc' },
        include: {
          code: {
            select: {
              id: true,
              code: true,
              isActive: true,
            },
          },
        },
      }),
      db.record.count({
        where: { codeId: (await params).codeId },
      }),
    ])
    
    return NextResponse.json({
      success: true,
      data: records,
      code: {
        id: code.id,
        code: code.code,
        isActive: code.isActive,
        vehicle: code.vehicle,
        owner: code.owner,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取挪车码记录失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}