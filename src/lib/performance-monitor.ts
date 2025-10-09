// 性能监控工具
export class PerformanceMonitor {
  private static slowQueryThreshold = 1000 // 1秒
  private static queryStats = new Map<string, { count: number; totalTime: number; maxTime: number }>()

  static async measureQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now()
    
    try {
      const result = await queryFn()
      const duration = Date.now() - start
      
      // 记录统计信息
      this.recordQueryStats(queryName, duration)
      
      // 记录慢查询
      if (duration > this.slowQueryThreshold) {
        console.warn(`🐌 慢查询检测: ${queryName} (${duration}ms)`)
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - start
      console.error(`❌ 查询失败: ${queryName} (${duration}ms)`, error)
      throw error
    }
  }

  private static recordQueryStats(queryName: string, duration: number) {
    const stats = this.queryStats.get(queryName) || { count: 0, totalTime: 0, maxTime: 0 }
    stats.count++
    stats.totalTime += duration
    stats.maxTime = Math.max(stats.maxTime, duration)
    this.queryStats.set(queryName, stats)
  }

  static getStats() {
    const stats = Array.from(this.queryStats.entries()).map(([name, data]) => ({
      queryName: name,
      count: data.count,
      avgTime: Math.round(data.totalTime / data.count),
      maxTime: data.maxTime,
      totalTime: data.totalTime
    }))
    
    return stats.sort((a, b) => b.avgTime - a.avgTime)
  }

  static resetStats() {
    this.queryStats.clear()
  }
}

// 数据库连接池监控
export class ConnectionPoolMonitor {
  static logPoolStatus() {
    // 这里可以添加连接池状态监控
    console.log('📊 数据库连接池状态检查')
  }
}

// API 响应时间监控
export function withApiMonitoring<T extends any[], R>(
  handler: (...args: T) => Promise<R>, 
  apiName: string
) {
  return async (...args: T): Promise<R> => {
    return PerformanceMonitor.measureQuery(`API:${apiName}`, () => handler(...args))
  }
}