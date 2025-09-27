import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// 更新挪车码的验证模式
const updateCodeSchema = z.object({
  isActive: z.boolean().optional(),
  expiredAt: z.string().datetime().optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const code = await db.code.findUnique({
      where: { id: (await params).id },
      include: {
        vehicle: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        records: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    
    if (!code) {
      return NextResponse.json(
        { error: '挪车码不存在' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: code,
    })
  } catch (error) {
    console.error('获取挪车码信息失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    
    // 验证请求数据
    const validatedData = updateCodeSchema.parse(body)
    
    // 检查挪车码是否存在
    const existingCode = await db.code.findUnique({
      where: { id: (await params).id }
    })
    
    if (!existingCode) {
      return NextResponse.json(
        { error: '挪车码不存在' },
        { status: 404 }
      )
    }
    
    // 更新挪车码信息
    const updateData: any = {}
    
    if (validatedData.isActive !== undefined) {
      updateData.isActive = validatedData.isActive
    }
    
    if (validatedData.expiredAt !== undefined) {
      updateData.expiredAt = validatedData.expiredAt ? new Date(validatedData.expiredAt) : null
    }
    
    const code = await db.code.update({
      where: { id: (await params).id },
      data: updateData,
      include: {
        vehicle: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    })
    
    return NextResponse.json({
      success: true,
      data: code,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('更新挪车码信息失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 检查挪车码是否存在
    const existingCode = await db.code.findUnique({
      where: { id: (await params).id },
      include: {
        _count: {
          select: {
            records: true,
          },
        },
      },
    })
    
    if (!existingCode) {
      return NextResponse.json(
        { error: '挪车码不存在' },
        { status: 404 }
      )
    }
    
    // 删除挪车码（级联删除相关记录）
    await db.code.delete({
      where: { id: (await params).id },
    })
    
    return NextResponse.json({
      success: true,
      message: '挪车码删除成功',
    })
  } catch (error) {
    console.error('删除挪车码失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}