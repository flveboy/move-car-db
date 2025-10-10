import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 根据sessionId获取历史回复消息（公开接口，无需认证）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId不能为空' },
        { status: 400 }
      )
    }

    // 根据sessionId查找所有对应的记录
    const records = await db.record.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' }
    })

    if (!records || records.length === 0) {
      return NextResponse.json(
        { error: '未找到对应的扫码记录' },
        { status: 404 }
      )
    }

    // 获取所有record的ID
    const recordIds = records.map(record => record.id)

    // 根据所有recordId查询最近24小时的回复消息
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const replies = await db.reply.findMany({
      where: {
        recordId: {
          in: recordIds
        },
        createdAt: {
          gte: twentyFourHoursAgo
        }
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 格式化回复消息
    const formattedReplies = replies.map(reply => ({
      id: reply.id,
      message: reply.message,
      senderName: reply.sender.name,
      senderRole: reply.sender.role,
      timestamp: reply.createdAt.toISOString(),
      recordId: reply.recordId
    }))

    return NextResponse.json({
      success: true,
      data: {
        records: records.map(record => ({
          id: record.id,
          scanTime: record.scanTime,
          createdAt: record.createdAt
        })),
        replies: formattedReplies
      }
    })
    
  } catch (error) {
    console.error('获取历史消息失败:', error)
    return NextResponse.json(
      { error: '获取历史消息失败' },
      { status: 500 }
    )
  }
}