// 数据库优化配置和工具
import { db } from './db'

// 数据库连接优化配置
export const dbOptimizationConfig = {
  // 连接池配置
  connectionPool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200
  },
  
  // 查询优化配置
  queryOptimization: {
    // 默认分页大小
    defaultPageSize: 10,
    maxPageSize: 100,
    
    // 缓存TTL（毫秒）
    cacheTTL: {
      user: 5 * 60 * 1000,      // 5分钟
      vehicle: 2 * 60 * 1000,   // 2分钟
      code: 30 * 1000,          // 30秒
      config: 10 * 60 * 1000    // 10分钟
    }
  }
}

// 批量查询优化工具
export class BatchQueryOptimizer {
  // 批量获取用户信息
  static async batchGetUsers(userIds: string[]) {
    if (userIds.length === 0) return []
    
    return db.owner.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isActive: true
      }
    })
  }
  
  // 批量获取车辆信息
  static async batchGetVehicles(vehicleIds: string[]) {
    if (vehicleIds.length === 0) return []
    
    return db.vehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: {
        id: true,
        licensePlate: true,
        brand: true,
        model: true,
        color: true,
        ownerId: true
      }
    })
  }
  
  // 批量统计查询
  static async batchGetCounts(queries: Array<{ model: string; where: any }>) {
    const promises = queries.map(query => {
      switch (query.model) {
        case 'vehicle':
          return db.vehicle.count({ where: query.where })
        case 'code':
          return db.code.count({ where: query.where })
        case 'record':
          return db.record.count({ where: query.where })
        default:
          return Promise.resolve(0)
      }
    })
    
    return Promise.all(promises)
  }
}

// 查询构建器
export class QueryBuilder {
  // 构建分页查询
  static buildPaginationQuery(page: number, limit: number) {
    const normalizedLimit = Math.min(limit, dbOptimizationConfig.queryOptimization.maxPageSize)
    const offset = (page - 1) * normalizedLimit
    
    return {
      skip: offset,
      take: normalizedLimit
    }
  }
  
  // 构建搜索查询
  static buildSearchQuery(search: string, fields: string[]) {
    if (!search) return {}
    
    return {
      OR: fields.map(field => ({
        [field]: { contains: search }
      }))
    }
  }
  
  // 构建日期范围查询
  static buildDateRangeQuery(startDate?: Date, endDate?: Date, field = 'createdAt') {
    const where: any = {}
    
    if (startDate || endDate) {
      where[field] = {}
      if (startDate) where[field].gte = startDate
      if (endDate) where[field].lte = endDate
    }
    
    return where
  }
}

// 索引建议工具
export class IndexAnalyzer {
  // 分析查询并提供索引建议
  static analyzeQuery(model: string, where: any, orderBy?: any) {
    const suggestions: string[] = []
    
    // 分析 WHERE 条件
    if (where) {
      const whereFields = Object.keys(where)
      if (whereFields.length > 1) {
        suggestions.push(`考虑为 ${model} 表的 (${whereFields.join(', ')}) 创建复合索引`)
      }
    }
    
    // 分析 ORDER BY
    if (orderBy) {
      const orderFields = Object.keys(orderBy)
      suggestions.push(`确保 ${model} 表的 ${orderFields.join(', ')} 字段有索引`)
    }
    
    return suggestions
  }
  
  // 获取推荐的索引
  static getRecommendedIndexes() {
    return [
      // 用户表索引
      'CREATE INDEX IF NOT EXISTS idx_owners_username ON owners(username)',
      'CREATE INDEX IF NOT EXISTS idx_owners_phone ON owners(phone)',
      'CREATE INDEX IF NOT EXISTS idx_owners_role_active ON owners(role, isActive)',
      
      // 车辆表索引
      'CREATE INDEX IF NOT EXISTS idx_vehicle_owner_id ON Vehicle(ownerId)',
      'CREATE INDEX IF NOT EXISTS idx_vehicle_license_plate ON Vehicle(licensePlate)',
      
      // 挪车码表索引
      'CREATE INDEX IF NOT EXISTS idx_code_vehicle_owner ON Code(vehicleId, ownerId)',
      'CREATE INDEX IF NOT EXISTS idx_code_active_expired ON Code(isActive, expiredAt)',
      
      // 记录表索引
      'CREATE INDEX IF NOT EXISTS idx_records_owner_scan_time ON records(ownerId, scanTime DESC)',
      'CREATE INDEX IF NOT EXISTS idx_records_code_created ON records(codeId, createdAt DESC)'
    ]
  }
}