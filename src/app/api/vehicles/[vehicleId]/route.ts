import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// 更新车辆的验证模式
const updateVehicleSchema = z.object({
  licensePlate: z.string().min(1, '车牌号不能为空').optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  // 钉钉通知配置
  dingtalkWebhook: z.string().optional(),
  dingtalkSign: z.boolean().optional(),
  dingtalkKeyword: z.string().optional(),
  dingtalkSecret: z.string().optional(),
  // 企微通知配置
  wechatWebhook: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const { vehicleId } = await params
    
    if (!vehicleId) {
      return NextResponse.json(
        { error: '车辆ID不能为空' },
        { status: 400 }
      )
    }
    
    const vehicle = await db.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        codes: {
          include: {
            records: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
      },
    })
    
    if (!vehicle) {
      return NextResponse.json(
        { error: '车辆不存在' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: vehicle,
    })
  } catch (error) {
    console.error('获取车辆信息失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const body = await request.json()
    const { vehicleId } = await params
    
    if (!vehicleId) {
      return NextResponse.json(
        { error: '车辆ID不能为空' },
        { status: 400 }
      )
    }
    
    // 验证请求数据
    const validatedData = updateVehicleSchema.parse(body)
    
    // 检查车辆是否存在
    const existingVehicle = await db.vehicle.findUnique({
      where: { id: vehicleId }
    })
    
    if (!existingVehicle) {
      return NextResponse.json(
        { error: '车辆不存在' },
        { status: 404 }
      )
    }
    
    // 如果更新车牌号，检查是否已被其他车辆使用
    if (validatedData.licensePlate) {
      const licensePlateVehicle = await db.vehicle.findFirst({
        where: { 
          licensePlate: validatedData.licensePlate,
          id: { not: vehicleId }
        }
      })
      
      if (licensePlateVehicle) {
        return NextResponse.json(
          { error: '该车牌号已被其他车辆使用' },
          { status: 400 }
        )
      }
    }
    
    // 更新车辆信息
    const vehicle = await db.vehicle.update({
      where: { id: vehicleId },
      data: validatedData,
      include: {
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
      data: vehicle,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('更新车辆信息失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const { vehicleId } = await params
    
    if (!vehicleId) {
      return NextResponse.json(
        { error: '车辆ID不能为空' },
        { status: 400 }
      )
    }
    
    // 检查车辆是否存在，并包含关联的所有信息
    const existingVehicle = await db.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        codes: {
          include: {
            _count: {
              select: {
                records: true,
              },
            },
          },
        },
        drivers: true, // 包含代开驾驶员信息
        _count: {
          select: {
            codes: true,
            drivers: true,
          },
        },
      },
    })
    
    if (!existingVehicle) {
      return NextResponse.json(
        { error: '车辆不存在' },
        { status: 404 }
      )
    }
    
    // 使用事务确保数据一致性，按正确顺序删除所有相关数据
    await db.$transaction(async (tx) => {
      // 1. 删除所有挪车码的扫描记录
      if (existingVehicle.codes.length > 0) {
        await tx.record.deleteMany({
          where: {
            codeId: {
              in: existingVehicle.codes.map(code => code.id),
            },
          },
        })
      }
      
      // 2. 删除所有挪车码（包括车主和代开驾驶员的）
      await tx.code.deleteMany({
        where: {
          vehicleId: vehicleId,
        },
      })
      
      // 3. 删除所有代开驾驶员
      await tx.driver.deleteMany({
        where: {
          vehicleId: vehicleId,
        },
      })
      
      // 4. 最后删除车辆
      await tx.vehicle.delete({
        where: { id: vehicleId },
      })
    })
    
    return NextResponse.json({
      success: true,
      message: '车辆及其关联的挪车码、代开驾驶员已成功删除',
      deletedCodesCount: existingVehicle._count?.codes || 0,
      deletedDriversCount: existingVehicle._count?.drivers || 0,
    })
  } catch (error) {
    console.error('删除车辆失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}