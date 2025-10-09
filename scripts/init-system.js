// 系统初始化脚本 - 独立运行版本
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()
const SALT_ROUNDS = 12

// 密码哈希函数
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// 初始化管理员账户
async function initializeAdmin() {
  try {
    const adminData = {
      phone: '13800138000',
      username: 'admin',
      name: '系统管理员',
      email: 'admin@movecardb.com',
      role: 'ADMIN',
      isActive: true
    }

    // 检查是否已存在管理员用户
    const existingAdmin = await prisma.owner.findFirst({
      where: { 
        OR: [
          { phone: adminData.phone },
          { username: adminData.username },
          { role: 'ADMIN' }
        ]
      }
    })

    if (existingAdmin) {
      console.log('✅ 管理员账户已存在，跳过初始化')
      console.log(`   用户名: ${existingAdmin.username}`)
      console.log(`   姓名: ${existingAdmin.name}`)
      console.log(`   角色: ${existingAdmin.role}`)
      return existingAdmin
    }

    // 哈希密码
    const hashedPassword = await hashPassword('admin123')

    // 创建管理员用户
    const admin = await prisma.owner.create({
      data: {
        ...adminData,
        password: hashedPassword
      }
    })

    console.log('🎉 管理员账户创建成功:')
    console.log(`   用户名: ${admin.username}`)
    console.log(`   姓名: ${admin.name}`)
    console.log(`   手机号: ${admin.phone}`)
    console.log(`   邮箱: ${admin.email}`)
    console.log(`   角色: ${admin.role}`)
    console.log(`   初始密码: admin123`)
    console.log('🔒 请立即登录并修改密码！')

    return admin

  } catch (error) {
    console.error('❌ 管理员账户初始化失败:', error)
    throw error
  }
}

// 初始化系统配置
async function initializeSystemConfig() {
  try {
    const defaultConfigs = [
      {
        key: 'ALLOW_REGISTRATION',
        value: 'true',  // 默认允许注册，方便测试
        type: 'BOOLEAN',
        description: '是否允许用户注册'
      },
      {
        key: 'SITE_NAME',
        value: 'Move Car DB',
        type: 'STRING',
        description: '网站名称'
      },
      {
        key: 'MAX_CODES_PER_USER',
        value: '10',
        type: 'NUMBER',
        description: '每个用户最大二维码数量'
      },
      {
        key: 'NOTIFICATION_ENABLED',
        value: 'true',
        type: 'BOOLEAN',
        description: '是否启用通知功能'
      },
      {
        key: 'AUTO_APPROVE_REGISTRATION',
        value: 'true',
        type: 'BOOLEAN',
        description: '是否自动批准用户注册'
      }
    ]

    let createdCount = 0
    let existingCount = 0

    for (const config of defaultConfigs) {
      const existing = await prisma.systemConfig.findUnique({
        where: { key: config.key }
      })

      if (!existing) {
        await prisma.systemConfig.create({
          data: config
        })
        console.log(`✅ 创建系统配置: ${config.key} = ${config.value}`)
        createdCount++
      } else {
        existingCount++
      }
    }

    if (createdCount > 0) {
      console.log(`🔧 系统配置初始化完成: 新建 ${createdCount} 项，已存在 ${existingCount} 项`)
    } else {
      console.log(`✅ 系统配置已存在，跳过初始化`)
    }

  } catch (error) {
    console.error('❌ 系统配置初始化失败:', error)
    throw error
  }
}

// 检查数据库连接
async function checkDatabaseConnection() {
  try {
    await prisma.$connect()
    console.log('✅ 数据库连接正常')
    return true
  } catch (error) {
    console.error('❌ 数据库连接失败:', error)
    return false
  }
}

// 主初始化函数
async function initializeSystem() {
  console.log('🚀 开始系统初始化...\n')
  
  try {
    // 检查数据库连接
    const dbConnected = await checkDatabaseConnection()
    if (!dbConnected) {
      console.log('💡 请确保数据库已正确配置并运行')
      process.exit(1)
    }

    // 初始化系统配置
    console.log('\n📋 初始化系统配置...')
    await initializeSystemConfig()
    
    // 初始化管理员账户
    console.log('\n👤 初始化管理员账户...')
    await initializeAdmin()
    
    console.log('\n🎉 系统初始化完成！')
    console.log('\n💡 下一步操作:')
    console.log('1. 启动服务器: npm run dev')
    console.log('2. 访问: http://localhost:3000')
    console.log('3. 使用管理员账户登录: admin / admin123')
    console.log('4. 立即修改管理员密码')

  } catch (error) {
    console.error('\n❌ 系统初始化失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// 如果直接运行这个脚本
if (require.main === module) {
  initializeSystem()
}

module.exports = {
  initializeSystem,
  initializeAdmin,
  initializeSystemConfig
}