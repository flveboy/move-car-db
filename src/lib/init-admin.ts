import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const SALT_ROUNDS = 12

// 密码哈希函数
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// 自动初始化管理员账户
export async function initializeAdmin(): Promise<void> {
  try {
    const adminData = {
      phone: '13800138000',
      username: 'admin',
      name: '系统管理员',
      email: 'admin@movecardb.com',
      role: 'ADMIN' as const,
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
      return
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

    console.log('🎉 管理员账户初始化成功:')
    console.log(`   用户名: ${admin.username}`)
    console.log(`   姓名: ${admin.name}`)
    console.log(`   手机号: ${admin.phone}`)
    console.log(`   邮箱: ${admin.email}`)
    console.log(`   角色: ${admin.role}`)
    console.log(`   初始密码: admin123`)
    console.log('🔒 请立即登录并修改密码！')

  } catch (error) {
    console.error('❌ 管理员账户初始化失败:', error)
    // 不抛出错误，避免影响服务器启动
  } finally {
    await prisma.$disconnect()
  }
}

// 初始化系统配置
export async function initializeSystemConfig(): Promise<void> {
  try {
    const defaultConfigs = [
      {
        key: 'ALLOW_REGISTRATION',
        value: 'false',
        type: 'BOOLEAN' as const,
        name: '允许用户注册',
        description: '是否允许用户注册'
      }
    ]

    for (const config of defaultConfigs) {
      const existing = await prisma.systemConfig.findUnique({
        where: { key: config.key }
      })

      if (!existing) {
        await prisma.systemConfig.create({
          data: config
        })
        console.log(`✅ 初始化系统配置: ${config.key} = ${config.value}`)
      }
    }

  } catch (error) {
    console.error('❌ 系统配置初始化失败:', error)
  }
}

// 综合初始化函数
export async function initializeSystem(): Promise<void> {
  console.log('🚀 开始系统初始化...')
  
  await initializeSystemConfig()
  await initializeAdmin()
  
  console.log('✅ 系统初始化完成')
}