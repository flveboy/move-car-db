import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { optimizedUserQueries } from '@/lib/optimized-queries'

export async function GET(request: NextRequest) {
  try {
    // 获取并验证 token
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
    
    // 获取用户ID
    const userId = payload.userId
    
    // 使用优化的统计查询
    const { vehicleCount, codeCount, notificationCount } = await optimizedUserQueries.getUserStats(userId)
    
    return NextResponse.json({
      stats: {
        vehicleCount,
        codeCount,
        notificationCount
      }
    })
    
  } catch (error) {
    console.error('获取用户统计信息错误:', error)
    return NextResponse.json(
      { error: '获取用户统计信息失败' },
      { status: 500 }
    )
  }
}