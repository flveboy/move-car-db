const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()
const SALT_ROUNDS = 12

// 密码哈希函数
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

async function createAdminUser() {
  try {
    const adminData = {
      phone: '13800138000',
      username: 'admin',
      name: '管理员',
      email: 'code1945@163.com',
      role: 'ADMIN',
      isActive: true
    }

    // 检查是否已存在管理员用户
    const existingAdmin = await prisma.owner.findUnique({
      where: { phone: adminData.phone }
    })

    if (existingAdmin) {
      console.log('管理员用户已存在:')
      console.log(`手机号: ${existingAdmin.phone}`)
      console.log(`姓名: ${existingAdmin.name}`)
       console.log(`用户名: ${existingAdmin. username}`)
      console.log(`角色: ${existingAdmin.role}`)
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

    console.log('管理员用户创建成功:')
    console.log(`手机号: ${admin.phone}`)
    console.log(`姓名: ${admin.name}`)
     console.log(`用户名: ${admin.username}`)
    console.log(`邮箱: ${admin.email}`)
    console.log(`角色: ${admin.role}`)
    console.log(`初始密码: admin123`)
    console.log('请立即登录并修改密码！')

  } catch (error) {
    console.error('创建管理员用户失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()