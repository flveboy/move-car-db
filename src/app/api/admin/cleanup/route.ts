import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authMiddleware } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResponse = await authMiddleware(request, 'ADMIN')
    if (authResponse.status !== 200) {
      return authResponse
    }

    // 计算两天前的时间
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

    // 开始事务
    const result = await db.$transaction(async (tx) => {
      // 1. 先删除replies表中两天前的数据
      const deletedReplies = await tx.reply.deleteMany({
        where: {
          createdAt: {
            lt: twoDaysAgo
          }
        }
      })

      // 2. 删除records表中两天前的数据（级联删除会处理相关的replies）
      const deletedRecords = await tx.record.deleteMany({
        where: {
          createdAt: {
            lt: twoDaysAgo
          }
        }
      })

      return {
        deletedReplies: deletedReplies.count,
        deletedRecords: deletedRecords.count
      }
    })

    return NextResponse.json({
      success: true,
      message: '数据库清理完成',
      data: {
        deletedReplies: result.deletedReplies,
        deletedRecords: result.deletedRecords,
        cutoffTime: twoDaysAgo.toISOString()
      }
    })

  } catch (error) {
    console.error('数据库清理失败:', error)
    return NextResponse.json(
      { success: false, error: '数据库清理失败' },
      { status: 500 }
    )
  }
}

// 获取清理统计信息
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResponse = await authMiddleware(request, 'ADMIN')
    if (authResponse.status !== 200) {
      return authResponse
    }

    // 计算两天前的时间
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

    // 获取需要清理的记录统计
    const [recordsToClean, repliesToClean, totalRecords, totalReplies] = await Promise.all([
      db.record.count({
        where: {
          createdAt: {
            lt: twoDaysAgo
          }
        }
      }),
      db.reply.count({
        where: {
          createdAt: {
            lt: twoDaysAgo
          }
        }
      }),
      db.record.count(),
      db.reply.count()
    ])

    return NextResponse.json({
      success: true,
      data: {
        recordsToClean,
        repliesToClean,
        cutoffTime: twoDaysAgo.toISOString(),
        totalRecords,
        totalReplies
      }
    })

  } catch (error) {
    console.error('获取清理统计失败:', error)
    return NextResponse.json(
      { success: false, error: '获取清理统计失败' },
      { status: 500 }
    )
  }
}