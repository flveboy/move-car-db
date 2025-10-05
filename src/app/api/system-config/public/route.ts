import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 获取公开的系统配置（无需认证）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    
    if (key) {
      // 获取单个配置
      const config = await db.systemConfig.findUnique({
        where: { key },
        select: {
          key: true,
          value: true,
          type: true
        }
      })
      
      if (!config) {
        // 如果配置不存在，返回默认值
        const defaultValue = getDefaultValue(key)
        return NextResponse.json({
          key,
          value: defaultValue,
          type: 'BOOLEAN'
        })
      }
      
      return NextResponse.json(config)
    } else {
      // 获取所有公开配置
      const configs = await db.systemConfig.findMany({
        select: {
          key: true,
          value: true,
          type: true
        }
      })
      
      return NextResponse.json({ configs })
    }
    
  } catch (error) {
    console.error('获取公开系统配置错误:', error)
    return NextResponse.json(
      { error: '获取配置失败' },
      { status: 500 }
    )
  }
}

// 获取默认配置值
function getDefaultValue(key: string): string {
  const defaults: Record<string, string> = {
    'ALLOW_REGISTRATION': 'true', // 默认开放注册
    // 可以在这里添加更多配置项的默认值
  }
  return defaults[key] || 'false'
}