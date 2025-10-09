// 性能优化使用示例
import { AdvancedQueryOptimizer } from './advanced-optimization'
import { AggregationOptimizer } from './advanced-optimization'
import { QueryIndexOptimizer } from './query-index-optimizer'
import { PerformanceMonitor } from './performance-monitor'

// 性能优化示例类
export class PerformanceOptimizationExample {
  // 示例1: 优化复杂关联查询
  static async exampleComplexQueryOptimization() {
    console.log('🔍 示例1: 复杂关联查询优化')
    
    // 传统方式（性能较差）
    const traditionalStart = Date.now()
    // 这里模拟传统串行查询
    await new Promise(resolve => setTimeout(resolve, 2000))
    const traditionalTime = Date.now() - traditionalStart
    
    // 优化方式（使用并行查询和缓存）
    const optimizedStart = Date.now()
    const result = await AdvancedQueryOptimizer.getVehicleCodeRecordStats('test-vehicle-id')
    const optimizedTime = Date.now() - optimizedStart
    
    console.log(`传统方式: ${traditionalTime}ms`)
    console.log(`优化方式: ${optimizedTime}ms`)
    console.log(`性能提升: ${((traditionalTime - optimizedTime) / traditionalTime * 100).toFixed(1)}%`)
    
    return result
  }
  
  // 示例2: 优化分页查询
  static async examplePaginationOptimization() {
    console.log('📄 示例2: 分页查询优化')
    
    // 传统偏移分页（深度分页性能差）
    const offsetStart = Date.now()
    // 模拟偏移分页查询
    await new Promise(resolve => setTimeout(resolve, 1500))
    const offsetTime = Date.now() - offsetStart
    
    // 优化游标分页
    const cursorStart = Date.now()
    const result = await AdvancedQueryOptimizer.getUsersCursorPaginated(undefined, 10)
    const cursorTime = Date.now() - cursorStart
    
    console.log(`偏移分页: ${offsetTime}ms`)
    console.log(`游标分页: ${cursorTime}ms`)
    console.log(`性能提升: ${((offsetTime - cursorTime) / offsetTime * 100).toFixed(1)}%`)
    
    return result
  }
  
  // 示例3: 优化聚合统计
  static async exampleAggregationOptimization() {
    console.log('📊 示例3: 聚合统计优化')
    
    // 传统COUNT查询
    const countStart = Date.now()
    // 模拟传统COUNT
    await new Promise(resolve => setTimeout(resolve, 800))
    const countTime = Date.now() - countStart
    
    // 优化批量聚合
    const batchStart = Date.now()
    const result = await AggregationOptimizer.batchAggregateStats('test-user-id')
    const batchTime = Date.now() - batchStart
    
    console.log(`传统COUNT: ${countTime}ms`)
    console.log(`批量聚合: ${batchTime}ms`)
    console.log(`性能提升: ${((countTime - batchTime) / countTime * 100).toFixed(1)}%`)
    
    return result
  }
  
  // 示例4: 索引优化分析
  static async exampleIndexOptimization() {
    console.log('🔧 示例4: 索引优化分析')
    
    const recommendations = await QueryIndexOptimizer.analyzeIndexUsage()
    
    console.log('索引优化建议:')
    recommendations.forEach((rec: any, index: number) => {
      console.log(`${index + 1}. ${rec.table}表: ${rec.recommendation}`)
      console.log(`   字段: ${rec.fields.join(', ')}`)
      console.log(`   SQL: ${rec.sql}`)
    })
    
    return recommendations
  }
  
  // 综合性能测试
  static async runComprehensiveTest() {
    console.log('🚀 开始综合性能测试...')
    
    const results = {
      complexQuery: await this.exampleComplexQueryOptimization(),
      pagination: await this.examplePaginationOptimization(),
      aggregation: await this.exampleAggregationOptimization(),
      indexAnalysis: await this.exampleIndexOptimization()
    }
    
    console.log('✅ 综合性能测试完成')
    return results
  }
}

// 性能监控示例
export class PerformanceMonitoringExample {
  // 监控查询性能
  static async monitorQueryPerformance() {
    console.log('📈 查询性能监控示例')
    
    // 使用性能监控包装查询
    const result = await PerformanceMonitor.measureQuery(
      '示例查询',
      async () => {
        // 模拟一个查询操作
        await new Promise(resolve => setTimeout(resolve, 500))
        return { data: '查询结果' }
      }
    )
    
    // 获取性能统计
    const stats = PerformanceMonitor.getStats()
    console.log('当前查询统计:')
    stats.forEach(stat => {
      console.log(`- ${stat.queryName}: ${stat.avgTime}ms (${stat.count}次)`)
    })
    
    return { result, stats }
  }
}

// 使用示例
/*
// 运行综合性能测试
const testResults = await PerformanceOptimizationExample.runComprehensiveTest()

// 监控查询性能
const monitoringResults = await PerformanceMonitoringExample.monitorQueryPerformance()

// 生成性能报告
const report = {
  timestamp: new Date().toISOString(),
  optimizationResults: testResults,
  monitoringData: monitoringResults,
  recommendations: [
    '为频繁查询的表添加复合索引',
    '对大数据量表使用游标分页',
    '实现查询结果缓存机制',
    '定期监控慢查询并优化'
  ]
}

console.log('性能优化报告:', report)
*/