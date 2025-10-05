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
        { 
          status: 400,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
          }
        }
      )
    }

    // 1. 先查找code记录获取关联ID
    const codeRecord = await db.code.findUnique({
      where: { code: code },
      select: {
        id: true,
        code: true,
        isActive: true,
        expiredAt: true,
        ownerId: true,
        driverId: true,
        vehicleId: true
      }
    })

    if (!codeRecord) {
      return NextResponse.json(
        { error: '挪车码不存在' },
        { 
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
          }
        }
      )
    }

    // 2. 并行获取车辆和驾驶员信息
    const [vehicle, driver] = await Promise.all([
      db.vehicle.findUnique({
        where: { id: codeRecord.vehicleId },
        include: {
          owner: {
            select: {
              phone: true,
              name: true
            }
          }
        }
      }),
      codeRecord.driverId ? db.driver.findUnique({
        where: { id: codeRecord.driverId },
        select: {
          phone: true,
          name: true,
          isActive: true
        }
      }) : Promise.resolve(null)
    ])

    if (!vehicle) {
      return NextResponse.json(
        { error: '关联车辆不存在' },
        { 
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
          }
        }
      )
    }

    if (!codeRecord) {
      return NextResponse.json(
        { error: '挪车码不存在' },
        { status: 404 }
      )
    }

    if (!codeRecord.isActive) {
      return NextResponse.json(
        { error: '挪车码已失效' },
        { 
          status: 410,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
          }
        }
      )
    }

    // 检查是否过期
    if (codeRecord.expiredAt && new Date() > codeRecord.expiredAt) {
      return NextResponse.json(
        { error: '挪车码已过期' },
        { 
          status: 410,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
          }
        }
      )
    }

    // 如果是代开驾驶员的挪车码，检查驾驶员是否启用
    if (driver && !driver.isActive) {
      return NextResponse.json(
        { error: '该挪车码已被停用' },
        { 
          status: 410,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
          }
        }
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

    // 返回完整挪车码信息
    return NextResponse.json({
      success: true,
      data: {
        id: codeRecord.id,
        code: codeRecord.code,
        isActive: codeRecord.isActive,
        expiredAt: codeRecord.expiredAt,
        vehicle: {
          id: vehicle.id,
          licensePlate: vehicle.licensePlate,
          brand: vehicle.brand,
          model: vehicle.model,
          color: vehicle.color,
          owner: {
            phone: vehicle.owner.phone,
            name: vehicle.owner.name
          }
        },
        driver: driver ? {
          phone: driver.phone,
          name: driver.name
        } : null
      }
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'Last-Modified': new Date().toUTCString(),
        'ETag': `"${Date.now()}-${Math.random()}"`,
        'Vary': 'User-Agent',
        // 微信浏览器特殊头部
        'X-Accel-Expires': '0',
        'X-Frame-Options': 'SAMEORIGIN'
      }
    })

  } catch (error) {
    console.error('查询挪车码失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        }
      }
    )
  }
}