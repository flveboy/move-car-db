import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { z } from 'zod'

// 回复消息验证schema
const createReplySchema = z.object({
  message: z.string().min(1, '回复内容不能为空').max(500, '回复内容不能超过500字')
})

// 获取记录的所有回复
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get token from header
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader || undefined)
    
    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      )
    }
    
    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      )
    }

    const { id: recordId } = await params

    // 检查记录是否存在
    const record = await db.record.findUnique({
      where: { id: recordId },
      include: {
        owner: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!record) {
      return NextResponse.json(
        { error: '记录不存在' },
        { status: 404 }
      )
    }
    
    // 只有记录的所有者或管理员可以查看回复
    if (record.ownerId !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '无权查看该记录的回复' },
        { status: 403 }
      )
    }

    // 获取回复列表
    const replies = await db.reply.findMany({
      where: { recordId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: {
        replies,
        record: {
          id: record.id,
          message: record.message,
          scanTime: record.scanTime
        }
      }
    })
    
  } catch (error) {
    console.error('获取回复列表错误:', error)
    return NextResponse.json(
      { error: '获取回复列表失败' },
      { status: 500 }
    )
  }
}

// 创建回复
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get token from header
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader || undefined)
    
    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      )
    }
    
    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      )
    }

    const { id: recordId } = await params
    const body = await request.json()

    // 验证输入
    const validatedData = createReplySchema.parse(body)

    // 检查记录是否存在
    const record = await db.record.findUnique({
      where: { id: recordId },
      include: {
        owner: {
          select: {
            id: true,
            name: true
          }
        },
        code: {
          include: {
            vehicle: {
              select: {
                licensePlate: true
              }
            }
          }
        }
      }
    })

    if (!record) {
      return NextResponse.json(
        { error: '记录不存在' },
        { status: 404 }
      )
    }
    
    // 只有记录的所有者或管理员可以回复
    if (record.ownerId !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '无权回复该记录' },
        { status: 403 }
      )
    }

    // 创建回复
    const reply = await db.reply.create({
      data: {
        recordId,
        senderId: payload.userId,
        message: validatedData.message,
        senderType: payload.role === 'ADMIN' ? 'ADMIN' : 'USER'
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    })

    // 如果是管理员回复，可以发送通知给用户
    if (payload.role === 'ADMIN') {
      // 这里可以添加发送通知的逻辑
      console.log(`管理员回复了挪车记录 ${recordId}: ${validatedData.message}`)
    }

    // 通过WebSocket推送回复消息到扫码页面
    try {
      // 获取扫码记录以获取对应的挪车码
      const scanRecord = await db.record.findUnique({
        where: { id: recordId },
        include: {
          code: {
            select: {
              code: true
            }
          }
        }
      })
      
      if (scanRecord && scanRecord.sessionId) {
        // 构造WebSocket消息 - 使用sessionId格式与扫码页面匹配
        const wsMessage = {
          roomId: `session_${scanRecord.sessionId}`,
          message: reply.message,
          senderName: reply.sender.name,
          senderRole: reply.sender.role,
          timestamp: reply.createdAt.toISOString(),
          recordId: recordId
        }
        
        // 通过HTTP请求调用WebSocket推送API
        // 注意：这里需要确保WebSocket服务器和API服务器在同一主机上
        const pushResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/socket/push-reply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(wsMessage)
        });
        
        if (pushResponse.ok) {
          console.log('WebSocket消息推送成功')
        } else {
          console.log('WebSocket消息推送失败')
        }
      }
    } catch (wsError) {
      console.error('WebSocket推送失败:', wsError)
      // WebSocket推送失败不影响主要功能
    }

    return NextResponse.json({
      success: true,
      message: '回复发送成功',
      data: { reply }
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据格式错误', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('创建回复错误:', error)
    return NextResponse.json(
      { error: '创建回复失败' },
      { status: 500 }
    )
  }
}