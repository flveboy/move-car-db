// 性能测试工具
import { AdvancedQueryOptimizer } from './advanced-optimization'
import { AggregationOptimizer } from './advanced-optimization'
import { QueryIndexOptimizer } from './query-index-optimizer'
import { PerformanceMonitor } from './performance-monitor'

// 性能测试套件
export class PerformanceTestSuite {
  // 测试复杂关联查询性能
  static async testComplexQueries() {
    console.log('🚀 开始性能测试...')
    
    const results = {
      complexQuery: await this.testComplexQuery(),
      paginationQuery: await this.testPaginationQuery(),
      aggregationQuery: await this.testAggregationQuery(),
      indexAnalysis: await this.testIndexAnalysis()
    }
    
    console.log('✅ 性能测试完成')
    return results
  }
  
  // 测试复杂关联查询
  private static async testComplexQuery() {
    const startTime = Date.now()
    
    // 模拟车辆-挪车码-记录关联查询
    const result = await AdvancedQueryOptimizer.getVehicleCodeRecordStats('test-vehicle-id')
    
    const duration = Date.now() - startTime
    return {
      queryType: '复杂关联查询',
      duration: `${duration}ms`,
      status: duration < 1000 ? '优秀' : duration < 3000 ? '良好' : '需要优化'
    }
  }
  
  // 测试分页查询性能
  private static async testPaginationQuery() {
    const startTime = Date.now()
    
    // 测试游标分页
    const result = await AdvancedQueryOptimizer.getUsersCursorPaginated(undefined, 10)
    
    const duration = Date.now() - startTime
    return {
      queryType: '分页查询',
      duration: `${duration}ms`,
      status: duration < 500 ? '优秀' : duration < 1000 ? '良好' : '需要优化'
    }
  }
  
  // 测试聚合统计性能
  private static async testAggregationQuery() {
    const startTime = Date.now()
    
    // 测试批量聚合统计
    const result = await AggregationOptimizer.batchAggregateStats('test-user-id')
    
    const duration = Date.now() - startTime
    return {
      queryType: '聚合统计',
      duration: `${duration}ms`,
      status: duration < 200 ? '优秀' : duration < 500 ? '良好' : '需要优化'
    }
  }
  
  // 测试索引分析
  private static async testIndexAnalysis() {
    const startTime = Date.now()
    
    const recommendations = await QueryIndexOptimizer.analyzeIndexUsage()
    
    const duration = Date.now() - startTime
    return {
      queryType: '索引分析',
      duration: `${duration}ms`,
      recommendations: (recommendations as any[]).length,
      status: '完成'
    }
  }
}

// 性能监控报告
export class PerformanceReport {
  static async generateReport() {
    // 模拟慢查询数据（实际项目中应该从监控系统获取）
    const slowQueries = [
      { queryName: 'getUsersPaginated', avgTime: 1200, count: 45 },
      { queryName: 'getVehicleCodeRecordStats', avgTime: 800, count: 23 },
      { queryName: 'batchAggregateStats', avgTime: 350, count: 67 }
    ]
    
    const indexRecommendations = await QueryIndexOptimizer.analyzeIndexUsage()
    
    return {
      timestamp: new Date().toISOString(),
      slowQueries: slowQueries.map(q => ({
        query: q.queryName,
        avgTime: q.avgTime,
        count: q.count,
        suggestion: q.avgTime > 1000 ? '需要优化' : '正常'
      })),
      indexRecommendations: indexRecommendations.map((rec: any) => ({
        table: rec.table,
        fields: rec.fields,
        recommendation: rec.recommendation
      })),
      overallStatus: this.getOverallStatus(slowQueries)
    }
  }
  
  private static getOverallStatus(slowQueries: any[]) {
    const criticalSlow = slowQueries.filter((q: any) => q.avgTime > 3000).length
    const moderateSlow = slowQueries.filter((q: any) => q.avgTime > 1000).length
    
    if (criticalSlow > 0) return '需要紧急优化'
    if (moderateSlow > 2) return '需要优化'
    return '运行良好'
  }
}

// 使用示例
// const testResults = await PerformanceTestSuite.testComplexQueries()
// console.log('性能测试结果:', testResults)

// const report = await PerformanceReport.generateReport()
// console.log('性能报告:', report)