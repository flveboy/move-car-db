const { PrismaClient } = require('@prisma/client')

async function initSystemConfig() {
  const prisma = new PrismaClient()
  
  try {
    console.log('正在初始化系统配置...')
    
    // 先测试数据库连接
    await prisma.$connect()
    console.log('数据库连接成功')
    
    // 创建默认的系统配置
    const configs = [
      {
        key: 'ALLOW_REGISTRATION',
        value: 'true',
        type: 'BOOLEAN',
        name: '开放注册',
        description: '控制是否允许新用户注册账号'
      }
    ]
    
    for (const config of configs) {
      try {
        const existingConfig = await prisma.systemConfig.findUnique({
          where: { key: config.key }
        })
        
        if (!existingConfig) {
          await prisma.systemConfig.create({
            data: config
          })
          console.log(`✅ 创建配置: ${config.name} (${config.key})`)
        } else {
          console.log(`⚠️  配置已存在: ${config.name} (${config.key})`)
        }
      } catch (error) {
        console.error(`❌ 处理配置 ${config.key} 时出错:`, error.message)
      }
    }
    
    console.log('✅ 系统配置初始化完成')
    
  } catch (error) {
    console.error('❌ 初始化系统配置失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

initSystemConfig()