import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { PerformanceMonitor } from '@/lib/performance-monitor'
import { cache } from '@/lib/cache'

// 获取性能统计信息（管理员）
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResponse = await authMiddleware(request, 'ADMIN')
    if (authResponse.status !== 200) {
      return authResponse
    }

    const queryStats = PerformanceMonitor.getStats()
    
    return NextResponse.json({
      performance: {
        queryStats,
        cacheStats: {
          // 这里可以添加缓存统计信息
          message: '缓存统计功能待实现'
        },
        recommendations: generateRecommendations(queryStats)
      }
    })
    
  } catch (error) {
    console.error('获取性能统计错误:', error)
    return NextResponse.json(
      { error: '获取性能统计失败' },
      { status: 500 }
    )
  }
}

// 清除性能统计（管理员）
export async function DELETE(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResponse = await authMiddleware(request, 'ADMIN')
    if (authResponse.status !== 200) {
      return authResponse
    }

    PerformanceMonitor.resetStats()
    cache.clear()
    
    return NextResponse.json({
      message: '性能统计已清除'
    })
    
  } catch (error) {
    console.error('清除性能统计错误:', error)
    return NextResponse.json(
      { error: '清除性能统计失败' },
      { status: 500 }
    )
  }
}

function generateRecommendations(queryStats: any[]) {
  const recommendations: Array<{
    type: string;
    message: string;
    queries?: string[];
  }> = []
  
  // 检查慢查询
  const slowQueries = queryStats.filter(stat => stat.avgTime > 1000)
  if (slowQueries.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `发现 ${slowQueries.length} 个慢查询，建议优化`,
      queries: slowQueries.map(q => q.queryName)
    })
  }
  
  // 检查高频查询
  const highFrequencyQueries = queryStats.filter(stat => stat.count > 100)
  if (highFrequencyQueries.length > 0) {
    recommendations.push({
      type: 'info',
      message: `发现 ${highFrequencyQueries.length} 个高频查询，建议增加缓存`,
      queries: highFrequencyQueries.map(q => q.queryName)
    })
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      message: '当前性能表现良好'
    })
  }
  
  return recommendations
}