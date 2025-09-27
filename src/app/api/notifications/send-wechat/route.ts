import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { vehicleId, message, code } = await request.json()

    if (!vehicleId || !message?.trim() || !code) {
      return NextResponse.json(
        { error: '参数不完整' },
        { status: 400 }
      )
    }

    // 检查速率限制
    const rateLimitResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/rate-limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type: 'wechat' })
    })

    const rateLimitData = await rateLimitResponse.json()
    
    if (!rateLimitData.success) {
      return NextResponse.json({
        success: false,
        error: rateLimitData.error,
        data: { rateLimit: rateLimitData.data }
      }, { status: 429 })
    }

    // 获取车辆信息
    const vehicle = await db.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        owner: {
          select: {
            name: true
          }
        }
      }
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: '车辆不存在' },
        { status: 404 }
      )
    }

    // 检查是否配置了企微webhook
    if (!vehicle.wechatWebhook) {
      return NextResponse.json(
        { error: '车主未配置企业微信通知' },
        { status: 400 }
      )
    }

    // 构建消息内容
    const ownerName = vehicle.owner?.name || '车主'
    const now = new Date()
    // 转换为中国时区 (UTC+8)
    const chinaTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (8 * 3600000))
    const notificationTime = `${chinaTime.getFullYear()}-${String(chinaTime.getMonth() + 1).padStart(2, '0')}-${String(chinaTime.getDate()).padStart(2, '0')} ${String(chinaTime.getHours()).padStart(2, '0')}:${String(chinaTime.getMinutes()).padStart(2, '0')}:${String(chinaTime.getSeconds()).padStart(2, '0')}`
    const messageContent = `【挪车通知】\n\n尊敬的${ownerName}，您的车辆 ${vehicle.licensePlate} 需要移车。\n\n通知内容：${message}\n\n通知时间：${notificationTime}\n\n请尽快处理，谢谢！`

    const payload = {
      msgtype: 'text',
      text: {
        content: messageContent
      }
    }

    // 发送请求到企业微信
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时
    
    try {
      const response = await fetch(vehicle.wechatWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      const result = await response.json()
      
      if (result.errcode === 0) {
        // 记录成功的通知
        const codeRecord = await db.code.findFirst({ where: { code } })
        if (codeRecord) {
          await db.record.create({
            data: {
              codeId: codeRecord.id,
              ownerId: vehicle.ownerId,
              ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown',
              message: `企微通知: ${message}`
            }
          })
        }

        return NextResponse.json({
          success: true,
          message: '通知发送成功',
          data: {
            rateLimit: rateLimitData.data
          }
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.errmsg || '发送失败',
          data: {
            rateLimit: rateLimitData.data
          }
        }, { status: 400 })
      }
    } catch (error: any) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: '请求超时，请检查webhook地址是否正确',
          data: {
            rateLimit: rateLimitData.data
          }
        }, { status: 408 })
      }
      
      console.error('企业微信通知发送失败:', error)
      return NextResponse.json({
        success: false,
        error: '发送失败，请稍后重试',
        data: {
          rateLimit: rateLimitData.data
        }
      }, { status: 500 })
    }
  } catch (error) {
    console.error('企业微信通知发送失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}