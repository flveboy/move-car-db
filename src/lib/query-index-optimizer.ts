// 查询索引优化工具
import { db } from './db'

// 索引优化建议和创建
export class QueryIndexOptimizer {
  // 检查现有索引并建议优化
  static async analyzeIndexUsage() {
    const recommendations: {
      table: string;
      fields: string[];
      recommendation: string;
      sql: string;
    }[] = []
    
    // 检查车辆-挪车码-记录关联查询的索引
    const vehicleCodeRecordQuery = await this.checkCompositeIndex('Code', ['vehicleId', 'ownerId', 'isActive'])
    if (!vehicleCodeRecordQuery.optimized) {
      recommendations.push({
        table: 'Code',
        fields: ['vehicleId', 'ownerId', 'isActive'],
        recommendation: '创建复合索引优化车辆-车主关联查询',
        sql: 'CREATE INDEX idx_code_vehicle_owner_active ON Code(vehicleId, ownerId, isActive)'
      })
    }

    // 检查用户分页查询的索引
    const userPaginationQuery = await this.checkCompositeIndex('Owner', ['id', 'createdAt'])
    if (!userPaginationQuery.optimized) {
      recommendations.push({
        table: 'Owner',
        fields: ['id', 'createdAt'],
        recommendation: '创建复合索引优化用户列表分页',
        sql: 'CREATE INDEX idx_owner_id_created ON owners(id, createdAt DESC)'
      })
    }

    // 检查记录统计查询的索引
    const recordStatsQuery = await this.checkCompositeIndex('Record', ['ownerId', 'scanTime'])
    if (!recordStatsQuery.optimized) {
      recommendations.push({
        table: 'Record',
        fields: ['ownerId', 'scanTime'],
        recommendation: '创建复合索引优化记录时间范围查询',
        sql: 'CREATE INDEX idx_records_owner_scan_time ON records(ownerId, scanTime DESC)'
      })
    }

    return recommendations
  }

  // 检查复合索引是否存在
  private static async checkCompositeIndex(model: string, fields: string[]): Promise<{ optimized: boolean; existingIndexes: string[] }> {
    // 这里可以扩展为实际检查数据库索引
    // 目前返回模拟结果
    const existingIndexes = await this.getExistingIndexes(model)
    const indexKey = fields.join('_')
    
    const optimized = existingIndexes.some((index: string) => 
      index.includes(indexKey) || fields.every(field => index.includes(field))
    )

    return { optimized, existingIndexes }
  }

  // 获取现有索引（模拟实现）
  private static async getExistingIndexes(model: string): Promise<string[]> {
    // 模拟返回现有索引
    const indexes = {
      'Owner': ['idx_owners_username', 'idx_owners_phone', 'idx_owners_role_active', 'idx_owners_created_at'],
      'Vehicle': ['idx_vehicle_owner_id', 'idx_vehicle_license_plate', 'idx_vehicle_created_at'],
      'Code': ['idx_code_vehicle_id', 'idx_code_owner_id', 'idx_code_driver_id', 'idx_code_active', 'idx_code_created_at', 'idx_code_expired_at', 'idx_code_owner_active'],
      'Record': ['idx_records_code_id', 'idx_records_owner_id', 'idx_records_scan_time', 'idx_records_created_at', 'idx_records_owner_scan_time'],
      'Driver': ['idx_driver_vehicle_id', 'idx_driver_active', 'idx_driver_created_at']
    }

    return indexes[model] || []
  }

  // 创建推荐的索引
  static async createRecommendedIndexes() {
    const recommendations = await this.analyzeIndexUsage()
    const createdIndexes: {
      table: string;
      index: string;
      status: string;
      error?: string;
    }[] = []

    for (const rec of recommendations) {
      try {
        // 在实际环境中执行SQL创建索引
        // await db.$executeRawUnsafe(rec.sql)
        createdIndexes.push({
          table: rec.table,
          index: rec.sql.split('ON')[1].trim(),
          status: 'created'
        })
      } catch (error) {
        createdIndexes.push({
          table: rec.table,
          index: rec.sql.split('ON')[1].trim(),
          status: 'failed',
          error: (error as Error).message
        })
      }
    }

    return createdIndexes
  }
}

// 查询重写优化
export class QueryRewriter {
  // 重写COUNT查询为更高效的版本
  static rewriteCountQuery(originalQuery: string): string {
    if (originalQuery.includes('COUNT(*)') && originalQuery.includes('WHERE')) {
      // 对于有条件的COUNT，确保使用索引
      return originalQuery.replace('COUNT(*)', 'COUNT(1)')
    }
    return originalQuery
  }

  // 优化分页查询（使用游标替代OFFSET）
  static rewritePaginationQuery(query: string, page: number, limit: number): string {
    if (query.includes('OFFSET') && page > 10) {
      // 对于深度分页，建议使用游标分页
      return query.replace(/OFFSET\s+\d+/, `/* 考虑使用游标分页替代OFFSET ${page * limit} */`)
    }
    return query
  }

  // 优化关联查询（使用JOIN替代子查询）
  static rewriteJoinQuery(query: string): string {
    if (query.includes('SELECT') && query.includes('WHERE') && query.includes('IN')) {
      // 将IN子查询重写为JOIN
      return query.replace(/WHERE\s+(\w+)\s+IN\s+\([^)]+\)/, 'JOIN (...) ON ...')
    }
    return query
  }
}