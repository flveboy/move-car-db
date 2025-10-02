import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 生成钉钉签名
async function generateDingTalkSign(timestamp: number, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(`${timestamp}\n${secret}`)
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData)
  
  // 转换为base64格式（钉钉要求）
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
  
  // URL编码签名
  return encodeURIComponent(signatureBase64)
}

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
      body: JSON.stringify({ type: 'dingtalk' })
    })

    const rateLimitData = await rateLimitResponse.json()
    
    if (!rateLimitData.success) {
      return NextResponse.json({
        success: false,
        error: rateLimitData.error,
        data: { rateLimit: rateLimitData.data }
      }, { status: 429 })
    }

    // 获取车辆信息和关联的挪车码
    const vehicleWithCode = await db.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        codes: {
          where: { code },
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                phone: true,
                dingtalkWebhook: true,
                dingtalkSign: true,
                dingtalkKeyword: true,
                dingtalkSecret: true
              }
            }
          }
        }
      }
    })

    if (!vehicleWithCode) {
      return NextResponse.json(
        { error: '车辆不存在' },
        { status: 404 }
      )
    }

    // 检查是否有关联的挪车码
    if (!vehicleWithCode.codes || vehicleWithCode.codes.length === 0) {
      return NextResponse.json(
        { error: '挪车码不存在' },
        { status: 404 }
      )
    }

    const codeRecord = vehicleWithCode.codes[0]
    
    // 确定使用车主还是代开驾驶员的配置
    const contact = codeRecord.driver || vehicleWithCode.owner
    
    // 优先使用代开驾驶员的配置，如果未配置则使用车主的配置
    const driverHasDingtalkConfig = codeRecord.driver && (
      codeRecord.driver.dingtalkWebhook || 
      codeRecord.driver.dingtalkSign || 
      codeRecord.driver.dingtalkKeyword || 
      codeRecord.driver.dingtalkSecret
    )
    
    const dingtalkWebhook = driverHasDingtalkConfig 
      ? codeRecord.driver?.dingtalkWebhook 
      : vehicleWithCode.dingtalkWebhook
      
    const dingtalkSign = driverHasDingtalkConfig 
      ? codeRecord.driver?.dingtalkSign 
      : vehicleWithCode.dingtalkSign
      
    const dingtalkKeyword = driverHasDingtalkConfig 
      ? codeRecord.driver?.dingtalkKeyword 
      : vehicleWithCode.dingtalkKeyword
      
    const dingtalkSecret = driverHasDingtalkConfig 
      ? codeRecord.driver?.dingtalkSecret 
      : vehicleWithCode.dingtalkSecret

    // 检查是否配置了钉钉webhook
    if (!dingtalkWebhook) {
      return NextResponse.json(
        { error: '未配置钉钉通知' },
        { status: 400 }
      )
    }

    // 构建消息内容
    const contactName = contact?.name || '车主'
    const contactPhone = contact?.phone || '未知号码'
    const licensePlate = vehicleWithCode.licensePlate
    const now = new Date()
    // 转换为中国时区 (UTC+8)
    const chinaTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (8 * 3600000))
    const notificationTime = `${chinaTime.getFullYear()}-${String(chinaTime.getMonth() + 1).padStart(2, '0')}-${String(chinaTime.getDate()).padStart(2, '0')} ${String(chinaTime.getHours()).padStart(2, '0')}:${String(chinaTime.getMinutes()).padStart(2, '0')}:${String(chinaTime.getSeconds()).padStart(2, '0')}`
    const messageContent = `【挪车通知】\n\n尊敬的${contactName}，您的车辆 ${licensePlate} 需要移车。\n\n通知内容：${message}\n\n通知时间：${notificationTime}\n\n联系电话：${contactPhone}\n\n请尽快处理，谢谢！`

    const payload = {
      msgtype: 'text',
      text: {
        content: messageContent
      }
    }

    // 如果启用了加签，需要添加签名
    let url = dingtalkWebhook
    if (dingtalkSign && dingtalkSecret) {
      const timestamp = Date.now()
      const sign = await generateDingTalkSign(timestamp, dingtalkSecret)
      url += `&timestamp=${timestamp}&sign=${sign}`
    }

    // 发送请求到钉钉
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时
    
    try {
      const response = await fetch(url, {
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
        if (codeRecord) {
          await db.record.create({
            data: {
              codeId: codeRecord.id,
              ownerId: vehicleWithCode.ownerId,
              ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown',
              message: `钉钉通知: ${message}`
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
      
      console.error('钉钉通知发送失败:', error)
      return NextResponse.json({
        success: false,
        error: '发送失败，请稍后重试',
        data: {
          rateLimit: rateLimitData.data
        }
      }, { status: 500 })
    }
  } catch (error) {
    console.error('钉钉通知发送失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}