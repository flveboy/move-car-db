import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { NextResponse } from 'next/server'


export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader || undefined)
    if (!token) {
      return NextResponse.json({ error: '未认证' }, { status: 401 })
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '无效令牌' }, { status: 401 })
    }
    
    const user = await db.owner.findUnique({
      where: { id: payload.userId }
    })
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const config = await db.notificationConfig.findFirst({
      where: { ownerId: user.id }
    })

    return NextResponse.json(config || {})
  } catch (error) {
    return NextResponse.json(
      { error: '获取通知配置失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader || undefined)
    if (!token) {
      return NextResponse.json({ error: '未认证' }, { status: 401 })
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '无效令牌' }, { status: 401 })
    }
    
    const user = await db.owner.findUnique({
      where: { id: payload.userId }
    })
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const data = await request.json()

    // 先尝试查找现有配置
    const existingConfig = await db.notificationConfig.findFirst({
      where: { ownerId: user.id }
    })

    let config
    if (existingConfig) {
      // 更新现有配置
      config = await db.notificationConfig.update({
        where: { id: existingConfig.id },
        data: {
          ...data,
          ownerId: user.id // 确保更新时包含 ownerId
        }
      })
    } else {
      // 创建新配置
      config = await db.notificationConfig.create({
        data: {
          ownerId: user.id,
          ...data
        }
      })
    }

    return NextResponse.json(config)
  } catch (error) {
    return NextResponse.json(
      { error: '保存通知配置失败' },
      { status: 500 }
    )
  }
}