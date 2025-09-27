import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

// 用户更新验证 schema
const updateUserSchema = z.object({
  name: z.string().min(2, '姓名至少2个字符').optional(),
  email: z.string().email('请输入有效的邮箱地址').optional().or(z.literal('')),
  role: z.enum(['USER', 'ADMIN']).optional(),
  isActive: z.boolean().optional()
})

// 获取单个用户信息
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 验证管理员权限
    const authResponse = await authMiddleware(request, 'ADMIN')
    if (authResponse.status !== 200) {
      return authResponse
    }
    
    const { id } = await params
    
    // 获取用户信息
    const user = await db.owner.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
        _count: {
          select: {
            vehicles: true,
            codes: true,
            records: true
          }
        }
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      user
    })
    
  } catch (error) {
    console.error('获取用户信息错误:', error)
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    )
  }
}

// 更新用户信息
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 验证管理员权限
    const authResponse = await authMiddleware(request, 'ADMIN')
    if (authResponse.status !== 200) {
      return authResponse
    }
    
    const { id } = await params
    const body = await request.json()
    
    // 验证输入
    const validatedData = updateUserSchema.parse(body)
    
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
    
    // 更新用户信息
    const updatedUser = await db.owner.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.email !== undefined && { email: validatedData.email || null }),
        ...(validatedData.role && { role: validatedData.role }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive })
      },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    })
    
    return NextResponse.json({
      message: '用户信息更新成功',
      user: updatedUser
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据格式错误', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('更新用户信息错误:', error)
    return NextResponse.json(
      { error: '更新用户信息失败' },
      { status: 500 }
    )
  }
}

// 删除用户
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 验证管理员权限
    const authResponse = await authMiddleware(request, 'ADMIN')
    if (authResponse.status !== 200) {
      return authResponse
    }
    
    const { id } = await params
    
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
    
    // 删除用户（级联删除相关数据）
    await db.owner.delete({
      where: { id }
    })
    
    return NextResponse.json({
      message: '用户删除成功'
    })
    
  } catch (error) {
    console.error('删除用户错误:', error)
    return NextResponse.json(
      { error: '删除用户失败' },
      { status: 500 }
    )
  }
}