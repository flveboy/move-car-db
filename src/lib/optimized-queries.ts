import { db } from './db'
import { withCache, OwnerCache, SystemConfigCache } from './cache'
import { PerformanceMonitor } from './performance-monitor'
import { AdvancedQueryOptimizer } from './advanced-optimization'
import { AggregationOptimizer } from './advanced-optimization'

// 优化的用户查询
export const optimizedUserQueries = {
  // 获取用户基本信息（避免过度关联）
  async getUserBasic(userId: string) {
    return PerformanceMonitor.measureQuery('getUserBasic', () =>
      OwnerCache.getById(userId, async () => {
        return db.owner.findUnique({
          where: { id: userId },
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
          }
        })
      })
    )
  },

  // 获取用户统计信息（使用聚合查询）
  async getUserStats(userId: string) {
    const cacheKey = `user_stats:${userId}`
    return withCache(cacheKey, async () => {
      const [vehicleCount, codeCount, notificationCount] = await Promise.all([
        db.vehicle.count({ where: { ownerId: userId } }),
        db.code.count({ where: { ownerId: userId } }),
        db.record.count({ where: { ownerId: userId } })
      ])
      
      return { vehicleCount, codeCount, notificationCount }
    }, 2 * 60 * 1000) // 2分钟缓存
  },

  // 分页获取用户列表（管理员用）- 优化版
  async getUsersPaginated(page: number, limit: number, search?: string) {
    // 对于深度分页，使用游标分页优化性能
    if (page > 5) {
      const cursor = await this.getCursorForPage(page, limit, search)
      const cursorResult = await AdvancedQueryOptimizer.getUsersCursorPaginated(cursor, limit)
      // 游标分页不返回总数，需要单独查询
      const where = search ? {
        OR: [
          { username: { contains: search } },
          { name: { contains: search } },
          { phone: { contains: search } }
        ]
      } : {}
      const total = await AggregationOptimizer.getApproximateCount('owner', where)
      return { ...cursorResult, total }
    }

    const offset = (page - 1) * limit
    const where = search ? {
      OR: [
        { username: { contains: search } },
        { name: { contains: search } },
        { phone: { contains: search } }
      ]
    } : {}

    // 使用并行查询而不是复杂的关联查询
    const [users, total] = await Promise.all([
      db.owner.findMany({
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
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      AggregationOptimizer.getApproximateCount('owner', where) // 使用近似计数
    ])

    // 批量获取统计信息
    const userIds = users.map(u => u.id)
    const [vehicleCounts, codeCounts, recordCounts] = await Promise.all([
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

    // 组装数据
    const usersWithStats = users.map(user => ({
      ...user,
      _count: {
        vehicles: vehicleCounts.find(v => v.ownerId === user.id)?._count || 0,
        codes: codeCounts.find(c => c.ownerId === user.id)?._count || 0,
        records: recordCounts.find(r => r.ownerId === user.id)?._count || 0
      }
    }))

    return { users: usersWithStats, total }
  },

  // 获取游标用于分页
  async getCursorForPage(page: number, limit: number, search?: string): Promise<string | undefined> {
    if (page <= 1) return undefined
    
    const offset = (page - 2) * limit // 获取前一页的最后一条记录
    const where = search ? {
      OR: [
        { username: { contains: search } },
        { name: { contains: search } },
        { phone: { contains: search } }
      ]
    } : {}

    const lastUser = await db.owner.findFirst({
      where,
      select: { id: true },
      skip: offset,
      take: 1,
      orderBy: { createdAt: 'desc' }
    })

    return lastUser?.id
  }
}

// 优化的车辆查询
export const optimizedVehicleQueries = {
  // 获取用户车辆列表（分页）
  async getUserVehicles(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit
    const cacheKey = `user_vehicles:${userId}:${page}:${limit}`
    
    return withCache(cacheKey, async () => {
      const [vehicles, total] = await Promise.all([
        db.vehicle.findMany({
          where: { ownerId: userId },
          select: {
            id: true,
            licensePlate: true,
            brand: true,
            model: true,
            color: true,
            createdAt: true,
            updatedAt: true
          },
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        db.vehicle.count({ where: { ownerId: userId } })
      ])

      // 批量获取挪车码统计
      const vehicleIds = vehicles.map(v => v.id)
      const codeCounts = await db.code.groupBy({
        by: ['vehicleId'],
        where: { vehicleId: { in: vehicleIds } },
        _count: true
      })

      const vehiclesWithStats = vehicles.map(vehicle => ({
        ...vehicle,
        _count: {
          codes: codeCounts.find(c => c.vehicleId === vehicle.id)?._count || 0
        }
      }))

      return { vehicles: vehiclesWithStats, total }
    }, 1 * 60 * 1000) // 1分钟缓存
  }
}

// 优化的挪车码查询
export const optimizedCodeQueries = {
  // 获取用户挪车码列表（分页）
  async getUserCodes(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit
    const cacheKey = `user_codes:${userId}:${page}:${limit}`
    
    return withCache(cacheKey, async () => {
      const [codes, total] = await Promise.all([
        db.code.findMany({
          where: { ownerId: userId },
          select: {
            id: true,
            code: true,
            isActive: true,
            createdAt: true,
            expiredAt: true,
            vehicle: {
              select: {
                id: true,
                licensePlate: true
              }
            },
            driver: {
              select: {
                id: true,
                name: true
              }
            }
          },
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        db.code.count({ where: { ownerId: userId } })
      ])

      return { codes, total }
    }, 1 * 60 * 1000) // 1分钟缓存
  },

  // 查找挪车码（优化版）
  async lookupCode(code: string) {
    const cacheKey = `code_lookup:${code}`
    
    return withCache(cacheKey, async () => {
      const codeRecord = await db.code.findUnique({
        where: { code },
        select: {
          id: true,
          vehicleId: true,
          ownerId: true,
          driverId: true,
          isActive: true,
          expiredAt: true
        }
      })

      if (!codeRecord) return null

      // 并行获取相关信息
      const [vehicle, driver] = await Promise.all([
        db.vehicle.findUnique({
          where: { id: codeRecord.vehicleId },
          select: {
            id: true,
            licensePlate: true,
            brand: true,
            model: true,
            color: true,
            owner: {
              select: {
                phone: true,
                name: true
              }
            }
          }
        }),
        codeRecord.driverId ? db.driver.findUnique({
          where: { id: codeRecord.driverId },
          select: {
            phone: true,
            name: true
          }
        }) : null
      ])

      return {
        code: codeRecord,
        vehicle,
        driver
      }
    }, 30 * 1000) // 30秒缓存
  }
}

// 优化的系统配置查询
export const optimizedSystemQueries = {
  async getConfig(key: string) {
    return SystemConfigCache.get(key, async () => {
      return db.systemConfig.findUnique({
        where: { key },
        select: {
          key: true,
          value: true,
          type: true
        }
      })
    })
  },

  async getPublicConfigs() {
    const cacheKey = 'public_configs'
    return withCache(cacheKey, async () => {
      return db.systemConfig.findMany({
        where: {
          key: {
            in: ['ALLOW_REGISTRATION', 'APP_NAME', 'CONTACT_INFO']
          }
        },
        select: {
          key: true,
          value: true,
          type: true
        }
      })
    }, 5 * 60 * 1000) // 5分钟缓存
  }
}