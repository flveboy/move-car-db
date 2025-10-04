import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    // 从URL路径提取车辆ID - 修正路径解析
    const pathSegments = request.nextUrl.pathname.split('/')
    const vehicleId = pathSegments[pathSegments.indexOf('vehicles') + 1]
    console.log('请求vehicleId:', vehicleId)  // 调试日志
    
    if (!vehicleId || vehicleId === 'drivers') {
      return NextResponse.json(
        { error: '缺少车辆ID参数' },
        { status: 400 }
      )
    }
    
    // 获取车辆的所有代开驾驶员
    const drivers = await db.driver.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'desc' }
    })
    console.log('查询结果:', drivers)  // 调试日志
    
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

export async function POST(request: NextRequest) {
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

     // 从URL路径提取车辆ID - 修正路径解析
    const pathSegments = request.nextUrl.pathname.split('/')
    const vehicleId = pathSegments[pathSegments.indexOf('vehicles') + 1]
    console.log('请求vehicleId:', vehicleId)  // 调试日志
    
    if (!vehicleId || vehicleId === 'drivers') {
      return NextResponse.json(
        { error: '缺少车辆ID参数' },
        { status: 400 }
      )
    }

    
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
        isActive: body.isActive !== undefined ? body.isActive : true, // 默认启用
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

