const { PrismaClient } = require('@prisma/client')

async function testConnection() {
  const prisma = new PrismaClient()
  
  try {
    console.log('测试数据库连接...')
    await prisma.$connect()
    
    // 列出所有可用的模型
    console.log('Prisma 客户端可用方法:', Object.keys(prisma).filter(key => !key.startsWith('$')))
    
    // 测试查询
    try {
      const result = await prisma.$queryRaw`SHOW TABLES`
      console.log('数据库表:', result)
    } catch (error) {
      console.error('查询表失败:', error.message)
    }
    
    console.log('✅ 数据库连接测试成功')
    
  } catch (error) {
    console.error('❌ 数据库连接失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()