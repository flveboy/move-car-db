import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string, driverId: string }> }
) {
  try {
    // 验证token
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader || undefined)
    
    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { 
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
          }
        }
      )
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { 
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
          }
        }
      )
    }

    const resolvedParams = await params
    const { vehicleId, driverId } = resolvedParams
    const body = await request.json()
    const { isActive } = body
    
    // 验证参数
    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive 参数必须是布尔值' },
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
    
    // 验证驾驶员是否存在且属于指定车辆
    const existingDriver = await db.driver.findFirst({
      where: {
        id: driverId,
        vehicleId: vehicleId
      }
    })
    
    if (!existingDriver) {
      return NextResponse.json(
        { error: '驾驶员不存在或不属于该车辆' },
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
    
    // 更新驾驶员状态
    const updatedDriver = await db.driver.update({
      where: { id: driverId },
      data: { isActive }
    })
    
    return NextResponse.json({
      success: true,
      data: updatedDriver
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })
    
  } catch (error) {
    console.error('切换驾驶员状态错误:', error)
    return NextResponse.json(
      { error: '切换驾驶员状态失败' },
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