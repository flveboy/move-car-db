import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ownerId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    
    // 检查车主是否存在
    const owner = await db.owner.findUnique({
      where: { id: (await params).ownerId },
      include: {
        vehicles: true,
        codes: true,
      },
    })
    
    if (!owner) {
      return NextResponse.json(
        { error: '车主不存在' },
        { status: 404 }
      )
    }
    
    // 获取该车主所有挪车码的扫码记录
    const [records, total] = await Promise.all([
      db.record.findMany({
        where: {
          code: {
            ownerId: (await params).ownerId,
          },
        },
        skip: offset,
        take: limit,
        orderBy: { scanTime: 'desc' },
        include: {
          code: {
            include: {
              vehicle: {
                select: {
                  id: true,
                  licensePlate: true,
                  brand: true,
                  model: true,
                  color: true,
                },
              },
            },
          },
        },
      }),
      db.record.count({
        where: {
          code: {
            ownerId: (await params).ownerId,
          },
        },
      }),
    ])
    
    return NextResponse.json({
      success: true,
      data: records,
      owner: {
        id: owner.id,
        name: owner.name,
        phone: owner.phone,
        email: owner.email,
        vehiclesCount: owner.vehicles.length,
        codesCount: owner.codes.length,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取车主记录失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}