import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// 更新车主的验证模式
const updateOwnerSchema = z.object({
  name: z.string().min(1, '姓名不能为空').optional(),
  email: z.string().email('邮箱格式不正确').optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const owner = await db.owner.findUnique({
      where: { id },
      include: {
        vehicles: {
          include: {
            codes: {
              include: {
                records: {
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                },
              },
            },
          },
        },
        codes: {
          include: {
            vehicle: true,
            records: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
      },
    })
    
    if (!owner) {
      return NextResponse.json(
        { error: '车主不存在' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: owner,
    })
  } catch (error) {
    console.error('获取车主信息失败:', error)
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
    const { id } = await params
    const body = await request.json()
    
    // 验证请求数据
    const validatedData = updateOwnerSchema.parse(body)
    
    // 检查车主是否存在
    const existingOwner = await db.owner.findUnique({
      where: { id }
    })
    
    if (!existingOwner) {
      return NextResponse.json(
        { error: '车主不存在' },
        { status: 404 }
      )
    }
    
    // 如果更新邮箱，检查是否已被其他车主使用
    if (validatedData.email) {
      const emailOwner = await db.owner.findFirst({
        where: { 
          email: validatedData.email,
          id: { not: id }
        }
      })
      
      if (emailOwner) {
        return NextResponse.json(
          { error: '该邮箱已被其他车主使用' },
          { status: 400 }
        )
      }
    }
    
    // 更新车主信息
    const owner = await db.owner.update({
      where: { id },
      data: validatedData,
    })
    
    return NextResponse.json({
      success: true,
      data: owner,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('更新车主信息失败:', error)
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
    const { id } = await params
    // 检查车主是否存在
    const existingOwner = await db.owner.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            vehicles: true,
            codes: true,
          },
        },
      },
    })
    
    if (!existingOwner) {
      return NextResponse.json(
        { error: '车主不存在' },
        { status: 404 }
      )
    }
    
    // 如果车主有关联的车辆或码，不允许删除
    if ((existingOwner._count?.vehicles || 0) > 0 || (existingOwner._count?.codes || 0) > 0) {
      return NextResponse.json(
        { error: '该车主下还有车辆或挪车码，无法删除' },
        { status: 400 }
      )
    }
    
    // 删除车主
    await db.owner.delete({
      where: { id },
    })
    
    return NextResponse.json({
      success: true,
      message: '车主删除成功',
    })
  } catch (error) {
    console.error('删除车主失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}