import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    if (!code) {
      return NextResponse.json(
        { error: '挪车码不能为空' },
        { status: 400 }
      )
    }

    // 查找挪车码
    const codeRecord = await db.code.findUnique({
      where: { code: code },
      include: {
        vehicle: {
          include: {
            owner: {
              select: {
                phone: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!codeRecord) {
      return NextResponse.json(
        { error: '挪车码不存在' },
        { status: 404 }
      )
    }

    if (!codeRecord.isActive) {
      return NextResponse.json(
        { error: '挪车码已失效' },
        { status: 410 }
      )
    }

    // 检查是否过期
    if (codeRecord.expiredAt && new Date() > codeRecord.expiredAt) {
      return NextResponse.json(
        { error: '挪车码已过期' },
        { status: 410 }
      )
    }

    // 记录扫描
    await db.record.create({
      data: {
        codeId: codeRecord.id,
        ownerId: codeRecord.ownerId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        message: 'QR码扫描'
      }
    })

    // 返回车辆信息
    const vehicleInfo = {
      id: codeRecord.vehicle.id,
      licensePlate: codeRecord.vehicle.licensePlate,
      brand: codeRecord.vehicle.brand,
      model: codeRecord.vehicle.model,
      color: codeRecord.vehicle.color,
      ownerPhone: codeRecord.vehicle.owner.phone,
      ownerName: codeRecord.vehicle.owner.name
    }

    return NextResponse.json({
      success: true,
      data: vehicleInfo
    })

  } catch (error) {
    console.error('查询挪车码失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}