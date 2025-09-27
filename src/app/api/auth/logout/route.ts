import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // 在实际应用中，这里可以将 token 加入黑名单
    // 由于使用的是 JWT 无状态认证，主要是前端清除 token
    
    return NextResponse.json({
      message: '退出登录成功'
    })
    
  } catch (error) {
    console.error('退出登录错误:', error)
    return NextResponse.json(
      { error: '退出登录失败' },
      { status: 500 }
    )
  }
}