import { NextRequest, NextResponse } from 'next/server'
import { Server } from 'socket.io'

// 由于Next.js API路由的限制，我们需要通过全局变量来访问Socket.IO实例
// 在实际部署中，应该使用Redis Pub/Sub或其他消息队列来处理跨进程通信

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId, message, senderName, senderRole, timestamp, recordId } = body

    // 验证必要字段
    if (!roomId || !message || !senderName) {
      return NextResponse.json(
        { error: '缺少必要字段' },
        { status: 400 }
      )
    }

    // 通过Socket.IO实例推送消息
    if ((global as any).io) {
      console.log('开始推送WebSocket消息到房间:', roomId)
      
      // 确保使用正确的Server类型
      const ioServer = (global as any).io
      ioServer.to(roomId).emit('reply_message', {
        id: Date.now().toString(),
        message,
        senderName,
        senderRole,
        timestamp,
        recordId
      })
      
      console.log('WebSocket消息已推送:', {
        roomId,
        message,
        senderName,
        senderRole,
        timestamp,
        recordId
      })
    } else {
      console.log('WebSocket实例不可用，模拟推送:', {
        roomId,
        message,
        senderName,
        senderRole,
        timestamp,
        recordId
      })
    }

    // 返回成功响应
    return NextResponse.json({
      success: true,
      message: 'WebSocket推送请求已接收'
    })

  } catch (error) {
    console.error('WebSocket推送API错误:', error)
    return NextResponse.json(
      { error: '内部服务器错误' },
      { status: 500 }
    )
  }
}