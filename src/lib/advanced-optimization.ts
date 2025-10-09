// 高级性能优化工具
import { db } from './db'
import { withCache } from './cache'
import { PerformanceMonitor } from './performance-monitor'

// 复杂关联查询优化
export class AdvancedQueryOptimizer {
  // 优化车辆-挪车码-记录的多表关联查询
  static async getVehicleCodeRecordStats(vehicleId: string) {
    const cacheKey = `vehicle_stats:${vehicleId}`
    
    return withCache(cacheKey, async () => {
      // 并行获取所有相关数据
      const [vehicle, codes, records] = await Promise.all([
        db.vehicle.findUnique({
          where: { id: vehicleId },
          select: {
            id: true,
            licensePlate: true,
            brand: true,
            model: true,
            color: true,
            ownerId: true
          }
        }),
        db.code.findMany({
          where: { vehicleId },
          select: {
            id: true,
            code: true,
            isActive: true,
            expiredAt: true
          }
        }),
        db.record.findMany({
          where: { 
            codeId: { 
              in: (await db.code.findMany({
                where: { vehicleId },
                select: { id: true }
              })).map(c => c.id)
            }
          },
          select: {
            id: true,
            scanTime: true,
            location: true
          },
          take: 100, // 限制记录数量
          orderBy: { scanTime: 'desc' }
        })
      ])

      return {
        vehicle,
        codeCount: codes.length,
        activeCodes: codes.filter(c => c.isActive).length,
        recentRecords: records.slice(0, 10), // 只返回最近10条记录
        totalRecords: records.length
      }
    }, 2 * 60 * 1000) // 2分钟缓存
  }

  // 优化用户列表分页查询（游标分页）
  static async getUsersCursorPaginated(cursor?: string, limit: number = 10) {
    const cacheKey = `users_cursor:${cursor || 'start'}:${limit}`
    
    return withCache(cacheKey, async () => {
      const where = cursor ? { id: { gt: cursor } } : {}
      
      const users = await db.owner.findMany({
        where,
        select: {
          id: true,
          username: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLogin: true
        },
        take: limit + 1, // 多取一个用于判断是否有下一页
        orderBy: { id: 'asc' } // 按ID排序确保游标稳定
      })

      const hasNextPage = users.length > limit
      const items = hasNextPage ? users.slice(0, limit) : users
      const nextCursor = hasNextPage ? items[items.length - 1].id : null

      // 批量获取统计信息
      const userIds = items.map(u => u.id)
      const [vehicleStats, codeStats, recordStats] = await Promise.all([
        db.vehicle.groupBy({
          by: ['ownerId'],
          where: { ownerId: { in: userIds } },
          _count: true
        }),
        db.code.groupBy({
          by: ['ownerId'],
          where: { ownerId: { in: userIds } },
          _count: true
        }),
        db.record.groupBy({
          by: ['ownerId'],
          where: { ownerId: { in: userIds } },
          _count: true
        })
      ])

      const usersWithStats = items.map(user => ({
        ...user,
        _count: {
          vehicles: vehicleStats.find(v => v.ownerId === user.id)?._count || 0,
          codes: codeStats.find(c => c.ownerId === user.id)?._count || 0,
          records: recordStats.find(r => r.ownerId === user.id)?._count || 0
        }
      }))

      return {
        users: usersWithStats,
        nextCursor,
        hasNextPage
      }
    }, 1 * 60 * 1000) // 1分钟缓存
  }
}

// 聚合统计优化
export class AggregationOptimizer {
  // 优化COUNT查询（使用近似计数）
  static async getApproximateCount(model: string, where?: any): Promise<number> {
    const cacheKey = `approx_count:${model}:${JSON.stringify(where || {})}`
    
    return withCache(cacheKey, async () => {
      // 对于大数据集，使用近似计数提高性能
      switch (model) {
        case 'record':
          // 对于记录表，可以基于时间范围估算
          if (where?.scanTime) {
            const totalEstimate = await db.$queryRaw<Array<{ count: bigint }>>`
              SELECT COUNT(*) as count FROM records 
              WHERE scanTime >= ${where.scanTime.gte} 
              AND scanTime <= ${where.scanTime.lte}
            `
            return Number(totalEstimate[0]?.count || 0)
          }
          break
        case 'owner':
          // 对于用户表，使用快速计数
          return db.owner.count({ where })
        default:
          break
      }
      
      // 默认使用精确计数
      return await db[model].count({ where })
    }, 5 * 60 * 1000) // 5分钟缓存
  }

  // 批量聚合统计（减少数据库往返）
  static async batchAggregateStats(ownerId: string) {
    const cacheKey = `batch_stats:${ownerId}`
    
    return withCache(cacheKey, async () => {
      // 使用原生SQL进行批量聚合
      const stats = await db.$queryRaw<Array<{
        vehicleCount: bigint;
        activeCodeCount: bigint;
        totalCodeCount: bigint;
        recordCount: bigint;
        todayRecordCount: bigint;
      }>>`
        SELECT 
          (SELECT COUNT(*) FROM Vehicle WHERE ownerId = ${ownerId}) as vehicleCount,
          (SELECT COUNT(*) FROM Code WHERE ownerId = ${ownerId} AND isActive = true) as activeCodeCount,
          (SELECT COUNT(*) FROM Code WHERE ownerId = ${ownerId}) as totalCodeCount,
          (SELECT COUNT(*) FROM records WHERE ownerId = ${ownerId}) as recordCount,
          (SELECT COUNT(*) FROM records WHERE ownerId = ${ownerId} AND DATE(scanTime) = CURDATE()) as todayRecordCount
      `

      return {
        vehicleCount: Number(stats[0]?.vehicleCount || 0),
        activeCodeCount: Number(stats[0]?.activeCodeCount || 0),
        totalCodeCount: Number(stats[0]?.totalCodeCount || 0),
        recordCount: Number(stats[0]?.recordCount || 0),
        todayRecordCount: Number(stats[0]?.todayRecordCount || 0)
      }
    }, 2 * 60 * 1000) // 2分钟缓存
  }

  // 预计算热门统计（减少实时计算）
  static async getPrecomputedStats() {
    const cacheKey = 'precomputed_stats'
    
    return withCache(cacheKey, async () => {
      const [userStats, vehicleStats, codeStats, recordStats] = await Promise.all([
        db.$queryRaw<Array<{ total: bigint; active: bigint }>>`SELECT COUNT(*) as total, SUM(isActive) as active FROM owners`,
        db.$queryRaw<Array<{ total: bigint }>>`SELECT COUNT(*) as total FROM Vehicle`,
        db.$queryRaw<Array<{ total: bigint; active: bigint }>>`SELECT COUNT(*) as total, SUM(isActive) as active FROM Code`,
        db.$queryRaw<Array<{ total: bigint; uniqueCodes: bigint }>>`SELECT COUNT(*) as total, COUNT(DISTINCT codeId) as uniqueCodes FROM records WHERE DATE(scanTime) = CURDATE()`
      ])

      return {
        totalUsers: Number(userStats[0]?.total || 0),
        activeUsers: Number(userStats[0]?.active || 0),
        totalVehicles: Number(vehicleStats[0]?.total || 0),
        totalCodes: Number(codeStats[0]?.total || 0),
        activeCodes: Number(codeStats[0]?.active || 0),
        todayScans: Number(recordStats[0]?.total || 0),
        todayUniqueCodes: Number(recordStats[0]?.uniqueCodes || 0)
      }
    }, 10 * 60 * 1000) // 10分钟缓存
  }
}

// 查询性能监控和优化建议
export class QueryPerformanceAdvisor {
  static async analyzeSlowQueries() {
    // 模拟慢查询数据（实际项目中应该从监控系统获取）
    const slowQueries = [
      { queryName: 'getUsersPaginated', avgTime: 1200, count: 45 },
      { queryName: 'getVehicleCodeRecordStats', avgTime: 800, count: 23 },
      { queryName: 'batchAggregateStats', avgTime: 350, count: 67 }
    ]
    
    const recommendations = slowQueries.map(query => {
      const suggestion = this.generateSuggestion(query)
      return {
        query: query.queryName,
        avgTime: query.avgTime,
        count: query.count,
        suggestion
      }
    })

    return recommendations
  }

  private static generateSuggestion(query: any) {
    const { queryName, avgTime } = query
    
    if (queryName.includes('count') && avgTime > 1000) {
      return '考虑使用近似计数或添加复合索引优化COUNT查询'
    }
    
    if (queryName.includes('findMany') && avgTime > 500) {
      return '检查是否需要添加索引或使用游标分页替代偏移分页'
    }
    
    if (queryName.includes('groupBy') && avgTime > 800) {
      return '考虑预计算聚合结果或添加合适的索引'
    }
    
    return '检查查询条件和索引使用情况'
  }
}