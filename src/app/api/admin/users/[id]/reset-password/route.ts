import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authMiddleware } from '@/lib/middleware'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

// 重置密码验证 schema
const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, '新密码至少6个字符')
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 验证管理员权限
    const authResponse = await authMiddleware(request, 'ADMIN')
    if (authResponse.status !== 200) {
      return authResponse
    }
    
    const { id } = await params
    const body = await request.json()
    
    // 验证输入
    const validatedData = resetPasswordSchema.parse(body)
    
    // 检查用户是否存在
    const existingUser = await db.owner.findUnique({
      where: { id }
    })
    
    if (!existingUser) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }
    
    // 哈希新密码
    const hashedPassword = await hashPassword(validatedData.newPassword)
    
    // 更新密码
    await db.owner.update({
      where: { id },
      data: { password: hashedPassword }
    })
    
    return NextResponse.json({
      message: '密码重置成功'
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据格式错误', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('重置密码错误:', error)
    return NextResponse.json(
      { error: '重置密码失败' },
      { status: 500 }
    )
  }
}