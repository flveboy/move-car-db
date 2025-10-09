import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import type { Server } from 'socket.io'

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader || '')
    
    if (!token) {
      return NextResponse.json(
        { error: '需要认证' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { recordId, message } = body

    if (!recordId || !message?.trim()) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 查找记录和会话ID
    const record = await db.record.findUnique({
      where: { id: recordId },
      select: {
        id: true,
        sessionId: true,
        codeId: true,
        ownerId: true
      }
    })

    if (!record) {
      return NextResponse.json(
        { error: '记录不存在' },
        { status: 404 }
      )
    }

    if (!record.sessionId) {
      return NextResponse.json(
        { error: '该记录没有会话ID，无法推送回复' },
        { status: 400 }
      )
    }

    // 获取管理员信息
    const admin = await db.owner.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true
      }
    })

    if (!admin) {
      return NextResponse.json(
        { error: '管理员不存在' },
        { status: 404 }
      )
    }

    // 创建回复记录
    const reply = await db.reply.create({
      data: {
        recordId: record.id,
        senderId: admin.id,
        message: message.trim(),
        senderType: 'ADMIN'
      }
    })


    

    // 通过Socket.IO推送回复消息
    const io = (global as any).io
    if (io) {
      const roomId = `session_${record.sessionId}`;
      console.log('管理员推送回复消息到房间:', roomId)
      
      // 使用正确的Server实例
      io.to(roomId).emit('reply_message', {
        id: reply.id,
        message: reply.message,
        senderName: admin.name || '管理员',
        senderRole: 'ADMIN',
        timestamp: reply.createdAt.toISOString(),
        recordId: record.id
      })
      
      console.log('管理员回复已推送:', {
        roomId,
        message: reply.message,
        senderName: admin.name,
        recordId: record.id
      })
    }

    return NextResponse.json({
      success: true,
      message: '回复发送成功',
      data: {
        reply: {
          id: reply.id,
          message: reply.message,
          senderName: admin.name,
          senderRole: 'ADMIN',
          timestamp: reply.createdAt.toISOString()
        }
      }
    })

  } catch (error) {
    console.error('推送回复失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}