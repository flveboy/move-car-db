import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 验证token
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader || undefined)
    
    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      )
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      )
    }

    // 确保params已解析
    const resolvedParams = await params
    if (!resolvedParams?.id) {
      return NextResponse.json(
        { error: '缺少车辆ID参数' },
        { status: 400 }
      )
    }

    const vehicleId = resolvedParams.id
    
    // 获取车辆的所有代开驾驶员
    const drivers = await db.driver.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({
      success: true,
      data: drivers
    }, { status: 200 })
    
  } catch (error) {
    console.error('获取代开驾驶员列表错误:', error)
    return NextResponse.json(
      { error: '获取代开驾驶员列表失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 验证token
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader || undefined)
    
    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      )
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      )
    }

    // 确保params已解析
    const resolvedParams = await params
    if (!resolvedParams?.id) {
      return NextResponse.json(
        { error: '缺少车辆ID参数' },
        { status: 400 }
      )
    }

    const vehicleId = resolvedParams.id
    const body = await request.json()
    
    // 验证车辆是否存在
    const vehicle = await db.vehicle.findUnique({
      where: { id: vehicleId }
    })
    
    if (!vehicle) {
      return NextResponse.json(
        { error: '车辆不存在' },
        { status: 404 }
      )
    }

    // 创建新的代开驾驶员
    const driver = await db.driver.create({
      data: {
        vehicleId,
        name: body.name,
        phone: body.phone,

        dingtalkWebhook: body.dingtalkWebhook || '',
        dingtalkSign: body.dingtalkSign || false,
        dingtalkSecret: body.dingtalkSecret || '',
        dingtalkKeyword: body.dingtalkKeyword || '',
        wechatWebhook: body.wechatWebhook || ''
      },
      include: {
        vehicle: true
      }
    })
    
    return NextResponse.json({
      success: true,
      data: driver
    }, { status: 201 })
    
  } catch (error) {
    console.error('添加代开驾驶员错误:', error)
    return NextResponse.json(
      { error: '添加代开驾驶员失败' },
      { status: 500 }
    )
  }
}

