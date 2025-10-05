const { PrismaClient } = require('@prisma/client')

async function testSystemConfig() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔧 测试系统配置功能...')
    
    // 测试数据库连接
    await prisma.$connect()
    console.log('✅ 数据库连接成功')
    
    // 检查 SystemConfig 表是否存在
    try {
      const count = await prisma.systemConfig.count()
      console.log(`📊 SystemConfig 表中有 ${count} 条记录`)
    } catch (error) {
      console.error('❌ SystemConfig 表不存在或无法访问:', error.message)
      return
    }
    
    // 清理现有配置
    await prisma.systemConfig.deleteMany()
    console.log('🧹 清理现有配置')
    
    // 插入默认配置
    const config = await prisma.systemConfig.create({
      data: {
        key: 'ALLOW_REGISTRATION',
        value: 'true',
        type: 'BOOLEAN',
        name: '开放注册',
        description: '控制是否允许用户注册'
      }
    })
    
    console.log('✅ 创建配置成功:', config)
    
    // 测试查询
    const foundConfig = await prisma.systemConfig.findUnique({
      where: { key: 'ALLOW_REGISTRATION' }
    })
    
    console.log('✅ 查询配置成功:', foundConfig)
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSystemConfig()