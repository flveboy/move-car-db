import { PrismaClient } from '@prisma/client'

declare module '@prisma/client' {
  interface PrismaClient {
    $use: (params: any, next: (params: any) => Promise<any>) => Promise<any>
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 带重试机制的数据库连接
const createPrismaClient = () => {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  }) as any

  // 添加连接检查中间件
  prisma.$use = async (params: any, next: (params: any) => Promise<any>) => {
    try {
      return await next(params)
    } catch (error) {
      console.error('数据库操作错误:', error)
      throw error
    }
  }

  return prisma
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// 添加连接测试函数
export async function testDatabaseConnection() {
  try {
    await db.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('数据库连接测试失败:', error)
    return false
  }
}

// 添加连接重试逻辑
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }
  throw lastError
}