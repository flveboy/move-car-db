import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

// 用户更新验证 schema
const updateUserSchema = z.object({
  name: z.string().min(2, '姓名至少2个字符').optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号').optional(),
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
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true
      }
    })
    
    if (!existingUser) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }
    
    // 保护初始admin账号不被修改状态
    if (existingUser.username === 'admin' && validatedData.isActive === false) {
      return NextResponse.json(
        { error: '不能禁用初始管理员账号' },
        { status: 403 }
      )
    }
    
    // 使用事务确保数据一致性
    const updatedUser = await db.$transaction(async (tx) => {
      // 更新用户信息
      const user = await tx.owner.update({
        where: { id },
        data: {
          ...(validatedData.name && { name: validatedData.name }),
          ...(validatedData.phone && { phone: validatedData.phone }),
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
      
      // 如果用户被禁用，同时禁用其所有挪车码
      if (validatedData.isActive === false) {
        await tx.code.updateMany({
          where: {
            ownerId: id
          },
          data: {
            isActive: false
          }
        })
      }
      
      // 如果用户被启用，同时启用其所有挪车码
      if (validatedData.isActive === true) {
        await tx.code.updateMany({
          where: {
            ownerId: id
          },
          data: {
            isActive: true
          }
        })
      }
      
      return user
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
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true
      }
    })
    
    if (!existingUser) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }
    
    // 保护初始admin账号不被删除
    if (existingUser.username === 'admin') {
      return NextResponse.json(
        { error: '不能删除初始管理员账号' },
        { status: 403 }
      )
    }
    
    // 获取用户的所有相关数据统计
    const userStats = await db.owner.findUnique({
      where: { id },
      include: {
        vehicles: {
          include: {
            codes: true,
            drivers: true
          }
        },
        codes: true,
        records: true,
        _count: {
          select: {
            vehicles: true,
            codes: true,
            records: true
          }
        }
      }
    })
    
    // 使用事务确保数据一致性，按正确顺序删除
    await db.$transaction(async (tx) => {
      // 1. 删除所有挪车码的扫描记录
      if (userStats?.codes.length) {
        await tx.record.deleteMany({
          where: {
            codeId: {
              in: userStats.codes.map(code => code.id)
            }
          }
        })
      }
      
      // 2. 删除用户直接拥有的挪车码
      await tx.code.deleteMany({
        where: {
          ownerId: id
        }
      })
      
      // 3. 处理用户的车辆
      if (userStats?.vehicles.length) {
        for (const vehicle of userStats.vehicles) {
          // 删除车辆相关的挪车码扫描记录
          if (vehicle.codes.length) {
            await tx.record.deleteMany({
              where: {
                codeId: {
                  in: vehicle.codes.map(code => code.id)
                }
              }
            })
          }
          
          // 删除车辆的挪车码
          await tx.code.deleteMany({
            where: {
              vehicleId: vehicle.id
            }
          })
          
          // 删除车辆的代开驾驶员
          await tx.driver.deleteMany({
            where: {
              vehicleId: vehicle.id
            }
          })
        }
        
        // 删除用户的所有车辆
        await tx.vehicle.deleteMany({
          where: {
            ownerId: id
          }
        })
      }
      
      // 4. 最后删除用户
      await tx.owner.delete({
        where: { id }
      })
    })
    
    return NextResponse.json({
      message: '用户及其所有相关数据删除成功',
      deletedData: {
        vehicles: userStats?._count.vehicles || 0,
        codes: userStats?._count.codes || 0,
        records: userStats?._count.records || 0,
        drivers: userStats?.vehicles.reduce((total, vehicle) => total + vehicle.drivers.length, 0) || 0
      }
    })
    
  } catch (error) {
    console.error('删除用户错误:', error)
    return NextResponse.json(
      { error: '删除用户失败' },
      { status: 500 }
    )
  }
}