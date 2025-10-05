import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

// 配置更新验证 schema
const updateConfigSchema = z.object({
  key: z.string(),
  value: z.string(),
  type: z.enum(['BOOLEAN', 'STRING', 'NUMBER', 'JSON']).default('BOOLEAN')
})

// 获取系统配置（管理员）
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResponse = await authMiddleware(request, 'ADMIN')
    if (authResponse.status !== 200) {
      return authResponse
    }
    
    const configs = await db.systemConfig.findMany({
      orderBy: { createdAt: 'asc' }
    })
    
    return NextResponse.json({ configs })
    
  } catch (error) {
    console.error('获取系统配置错误:', error)
    return NextResponse.json(
      { error: '获取系统配置失败' },
      { status: 500 }
    )
  }
}

// 更新系统配置（管理员）
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResponse = await authMiddleware(request, 'ADMIN')
    if (authResponse.status !== 200) {
      return authResponse
    }
    
    const body = await request.json()
    const validatedData = updateConfigSchema.parse(body)
    
    const config = await db.systemConfig.upsert({
      where: { key: validatedData.key },
      update: {
        value: validatedData.value,
        type: validatedData.type,
        updatedAt: new Date()
      },
      create: {
        key: validatedData.key,
        value: validatedData.value,
        type: validatedData.type,
        name: getConfigName(validatedData.key),
        description: getConfigDescription(validatedData.key)
      }
    })
    
    return NextResponse.json({
      message: '配置更新成功',
      config
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据格式错误', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('更新系统配置错误:', error)
    return NextResponse.json(
      { error: '更新配置失败' },
      { status: 500 }
    )
  }
}

// 获取配置名称
function getConfigName(key: string): string {
  const names: Record<string, string> = {
    'ALLOW_REGISTRATION': '开放注册',
    // 可以在这里添加更多配置项的名称
  }
  return names[key] || key
}

// 获取配置描述
function getConfigDescription(key: string): string {
  const descriptions: Record<string, string> = {
    'ALLOW_REGISTRATION': '控制是否允许新用户注册账号',
    // 可以在这里添加更多配置项的描述
  }
  return descriptions[key] || ''
}