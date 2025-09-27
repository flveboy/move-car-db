import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { webhook, sign, keyword, secret, message } = await request.json()

    if (!webhook?.trim()) {
      return NextResponse.json(
        { error: '请输入钉钉webhook地址' },
        { status: 400 }
      )
    }

    // 构建消息负载
    const payload = {
      msgtype: 'text',
      text: {
        content: message || '这是一条挪车码通知测试消息'
      }
    }

    // 如果启用了加签，需要添加签名
    let url = webhook
    if (sign && secret) {
      const timestamp = Date.now()
      const sign = await generateDingTalkSign(timestamp, secret)
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
        return NextResponse.json({
          success: true,
          message: '钉钉通知发送成功！'
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.errmsg || '未知错误',
          errcode: result.errcode
        }, { status: 400 })
      }
    } catch (error: any) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: '请求超时，请检查webhook地址是否正确或网络连接'
        }, { status: 408 })
      }
      
      console.error('钉钉通知测试失败:', error)
      return NextResponse.json(
        { error: '钉钉通知测试失败，请检查网络连接和配置' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('钉钉通知测试失败:', error)
    return NextResponse.json(
      { error: '钉钉通知测试失败，请检查网络连接和配置' },
      { status: 500 }
    )
  }
}

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