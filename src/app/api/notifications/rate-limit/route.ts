import { NextRequest, NextResponse } from 'next/server'

// 内存存储速率限制数据（在生产环境中应该使用Redis）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export async function GET(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    
    const now = Date.now()
    const minuteStart = Math.floor(now / 60000) * 60000
    const resetTime = minuteStart + 60000

    // 获取或创建速率限制记录
    let dingtalkRecord = rateLimitStore.get(`dingtalk:${clientIp}`)
    let wechatRecord = rateLimitStore.get(`wechat:${clientIp}`)

    // 如果记录不存在或已过期，创建新记录
    if (!dingtalkRecord || dingtalkRecord.resetTime <= now) {
      dingtalkRecord = { count: 0, resetTime }
      rateLimitStore.set(`dingtalk:${clientIp}`, dingtalkRecord)
    }

    if (!wechatRecord || wechatRecord.resetTime <= now) {
      wechatRecord = { count: 0, resetTime }
      rateLimitStore.set(`wechat:${clientIp}`, wechatRecord)
    }

    return NextResponse.json({
      success: true,
      data: {
        dingtalkCount: dingtalkRecord.count,
        wechatCount: wechatRecord.count,
        resetTime: wechatRecord.resetTime
      }
    })

  } catch (error) {
    console.error('获取速率限制失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json()
    
    if (!type || !['dingtalk', 'wechat'].includes(type)) {
      return NextResponse.json(
        { error: '无效的通知类型' },
        { status: 400 }
      )
    }

    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    
    const now = Date.now()
    const minuteStart = Math.floor(now / 60000) * 60000
    const resetTime = minuteStart + 60000

    // 获取或创建速率限制记录
    const key = `${type}:${clientIp}`
    let record = rateLimitStore.get(key)

    // 如果记录不存在或已过期，创建新记录
    if (!record || record.resetTime <= now) {
      record = { count: 0, resetTime }
      rateLimitStore.set(key, record)
    }

    // 检查是否超过限制
    if (record.count >= 10) {
      return NextResponse.json({
        success: false,
        error: '请求过于频繁',
        data: {
          dingtalkCount: type === 'dingtalk' ? record.count : rateLimitStore.get(`dingtalk:${clientIp}`)?.count || 0,
          wechatCount: type === 'wechat' ? record.count : rateLimitStore.get(`wechat:${clientIp}`)?.count || 0,
          resetTime: record.resetTime
        }
      }, { status: 429 })
    }

    // 增加计数
    record.count++
    rateLimitStore.set(key, record)

    return NextResponse.json({
      success: true,
      data: {
        dingtalkCount: rateLimitStore.get(`dingtalk:${clientIp}`)?.count || 0,
        wechatCount: rateLimitStore.get(`wechat:${clientIp}`)?.count || 0,
        resetTime: record.resetTime
      }
    })

  } catch (error) {
    console.error('更新速率限制失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}