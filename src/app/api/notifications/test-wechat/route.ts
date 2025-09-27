import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { webhook, message, messageType } = await request.json()

    if (!webhook?.trim()) {
      return NextResponse.json(
        { error: '请输入企业微信webhook地址' },
        { status: 400 }
      )
    }

    // 构建消息负载
    let payload
    
    if (messageType === 'text') {
      payload = {
        msgtype: 'text',
        text: {
          content: message || '这是一条挪车码通知测试消息'
        }
      }
    } else {
      payload = {
        msgtype: 'markdown',
        markdown: {
          content: message || '这是一条挪车码通知测试消息'
        }
      }
    }

    // 发送请求到企业微信
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时
    
    try {
      const response = await fetch(webhook, {
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
          message: '企业微信通知发送成功！'
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
      
      console.error('企业微信通知测试失败:', error)
      return NextResponse.json(
        { error: '企业微信通知测试失败，请检查网络连接和配置' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('企业微信通知测试失败:', error)
    return NextResponse.json(
      { error: '企业微信通知测试失败，请检查网络连接和配置' },
      { status: 500 }
    )
  }
}